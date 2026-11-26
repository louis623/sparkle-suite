'use client'

import { useEffect, useMemo, useState } from 'react'
import emojiSet from '@/lib/look/emoji-set.json'
import styles from './DashboardPlaceholder.module.css'

type EmojiItem = { e: string; n: string }
type EmojiGroup = { key: string; label: string; icon: string; items: EmojiItem[] }

const SET = emojiSet as EmojiGroup[]
const RECENT_KEY = 'sparkle-look-recent-emoji'
const SHORT: Record<string, string> = {
  recent: 'Recent',
  announce: 'Celebrate',
  jewelry: 'Jewelry',
  business: 'Business',
  shows: 'Shows',
  glam: 'Glam',
  love: 'Love',
  seasonal: 'Holidays',
  nature: 'Florals',
  treats: 'Treats',
  feels: 'Faces',
  symbols: 'Pointers',
}

function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function rankEmoji(name: string, needle: string) {
  const words = name.split(/[\s-]+/)
  if (words.some((word) => word === needle)) return 0
  if (words.some((word) => word.startsWith(needle))) return 1
  if (name.startsWith(needle)) return 2
  return 3
}

function remember(emoji: string) {
  const next = [emoji, ...readRecent().filter((item) => item !== emoji)].slice(0, 16)
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* recently used is optional */
  }
  return next
}

export function LookEmojiPicker({ onInsert }: { onInsert: (emoji: string) => void }) {
  const starter = SET.find((group) => group.key === 'recent')?.items.map((item) => item.e) ?? []
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('recent')
  const [recent, setRecent] = useState<string[]>(starter)
  const library = useMemo(
    () => SET.filter((group) => group.key !== 'recent').flatMap((group) => group.items),
    [],
  )
  const total = useMemo(() => new Set(library.map((item) => item.e)).size, [library])
  useEffect(() => {
    const stored = readRecent()
    if (stored.length > 0) setRecent(stored)
  }, [])
  useEffect(() => {
    const pop = document.getElementById('look-emoji-picker')
    if (!pop) return
    const onToggle = (event: Event) => {
      if ((event as ToggleEvent).newState !== 'open') return
      pop.querySelector('input')?.focus()
    }
    pop.addEventListener('toggle', onToggle)
    return () => pop.removeEventListener('toggle', onToggle)
  }, [])
  const needle = query.trim().toLowerCase()
  const recentItems = recent.map((emoji) => library.find((item) => item.e === emoji) ?? { e: emoji, n: emoji })
  const groups = SET.filter((group) => group.key !== 'recent')
    .map((group) => ({
      ...group,
      items: needle
        ? group.items
          .filter((item) => item.n.includes(needle) || item.e === query.trim())
          .sort((left, right) => rankEmoji(left.n, needle) - rankEmoji(right.n, needle))
        : group.items,
    }))
    .filter((group) => (needle ? group.items.length > 0 : group.key === active))

  function insert(emoji: string) {
    setRecent(remember(emoji))
    onInsert(emoji)
  }

  return (
    <div className={styles.lookEmojiWrap}>
      <button
        type="button"
        className={styles.lookToolOn}
        popoverTarget="look-emoji-picker"
        aria-label="Add an emoji"
      >
        <span aria-hidden="true">😊</span> Emoji
      </button>
      <div id="look-emoji-picker" popover="auto" className={styles.lookEmojiPop}>
        <label className={styles.lookEmojiSearch}>
          <span className={styles.visuallyHidden}>Search emojis</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${total} emojis · try “ring”, “heart”, “turkey”`}
            enterKeyHint="search"
          />
        </label>
        <div className={styles.lookEmojiTabs} role="group" aria-label="Emoji categories">
          {SET.map((group) => (
            <button
              key={group.key}
              type="button"
              className={active === group.key && !needle ? styles.lookEmojiTabOn : styles.lookEmojiTab}
              aria-pressed={active === group.key && !needle}
              onClick={() => {
                setActive(group.key)
                setQuery('')
              }}
            >
              <span aria-hidden="true">{group.icon}</span>
              {SHORT[group.key] ?? group.label}
            </button>
          ))}
        </div>
        <div className={styles.lookEmojiScroll}>
          {!needle ? (
            <section className={styles.lookEmojiSection}>
              <h4>Recently used <span>{recentItems.length}</span></h4>
              <div className={styles.lookEmojiGrid}>
                {recentItems.map((item) => (
                  <button key={`recent-${item.e}`} type="button" data-site-control="ticker-emoji" title={item.n} aria-label={`Add ${item.n}`} onClick={() => insert(item.e)}>
                    {item.e}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {(active === 'recent' && !needle ? [] : groups).map((group) => (
            <section key={group.key} className={styles.lookEmojiSection}>
              <h4>{group.label} <span>{group.items.length}</span></h4>
              <div className={styles.lookEmojiGrid}>
                {group.items.map((item) => (
                  <button key={`${group.key}-${item.e}`} type="button" data-site-control="ticker-emoji" title={item.n} aria-label={`Add ${item.n}`} onClick={() => insert(item.e)}>
                    {item.e}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {needle && groups.length === 0 ? <p className={styles.lookEmojiEmpty}>No emoji matches that search.</p> : null}
        </div>
        <p className={styles.lookEmojiFoot}>Adds at your cursor</p>
      </div>
    </div>
  )
}
