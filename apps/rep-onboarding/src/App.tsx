import { useEffect, useMemo, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { NicNac } from './components/NicNac';
import { Questions } from './components/Questions';
import { Resources } from './components/Resources';
import { StepDetail } from './components/StepDetail';
import { steps } from './data';
import {
  fetchRemoteOnboardingState,
  getConfiguredInviteToken,
  getSparkleSuiteApiBaseUrl,
  submitRemoteProgress,
  submitRemoteQuestion,
} from './integration/team-onboarding-client';
import { createInitialState, loadState, makeQuestion, resetState, saveState } from './state';
import type { RemoteOnboardingTeam } from './integration/team-onboarding-contract';
import type { AppState, RepQuestion, StepStatus } from './types';

type RemoteLoadState = 'local' | 'loading' | 'loaded' | 'error';

function toRemoteStepStatus(status: StepStatus) {
  if (status === 'needs-help') return 'needs_help';
  if (status === 'done') return 'done';
  return 'not_started';
}

function toLocalStepStatus(status: 'not_started' | 'done' | 'needs_help'): StepStatus {
  if (status === 'needs_help') return 'needs-help';
  if (status === 'done') return 'done';
  return 'not-started';
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadState());
  const [nicNacPrompt, setNicNacPrompt] = useState<string | null>(null);
  const [nicNacCloseSignal, setNicNacCloseSignal] = useState(0);
  const [remoteLoadState, setRemoteLoadState] = useState<RemoteLoadState>('local');
  const [remoteQuestionStatus, setRemoteQuestionStatus] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [team, setTeam] = useState<RemoteOnboardingTeam | null>(null);
  const [apiBaseUrl] = useState(() => getSparkleSuiteApiBaseUrl());
  const [inviteToken] = useState(() => getConfiguredInviteToken());
  const selectedStep = useMemo(
    () => steps.find((step) => step.id === appState.selectedStepId) ?? steps[0],
    [appState.selectedStepId],
  );

  useEffect(() => {
    saveState(appState);
  }, [appState]);

  useEffect(() => {
    if (!apiBaseUrl || !inviteToken) {
      setRemoteLoadState('local');
      return;
    }

    let isActive = true;
    setRemoteLoadState('loading');

    fetchRemoteOnboardingState({ apiBaseUrl, inviteToken })
      .then((remoteState) => {
        if (!isActive) return;
        setParticipantName(remoteState.participant.displayName);
        setTeam(remoteState.team);
        setAppState((current) => ({
          ...current,
          stepStatuses: {
            ...current.stepStatuses,
            ...Object.fromEntries(
              remoteState.progress.map((item) => [
                item.stepId,
                toLocalStepStatus(item.status),
              ]),
            ),
          },
          questions: [
            ...remoteState.messages
              .filter((message) => message.senderType === 'participant')
              .map((message) =>
                makeQuestion(message.body, null, 'rep'),
              ),
            ...current.questions,
          ],
        }));
        setRemoteLoadState('loaded');
      })
      .catch(() => {
        if (isActive) setRemoteLoadState('error');
      });

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, inviteToken]);

  const teamLabel = team?.teamName || 'Your team';
  const teamLeadName = team?.displayName || 'your team lead';

  useEffect(() => {
    document.title = `${teamLabel} New Rep Onboarding`;
  }, [teamLabel]);

  function selectStep(stepId: string) {
    setAppState((current) => ({ ...current, selectedStepId: stepId }));
  }

  function handleSectionNav() {
    setNicNacCloseSignal((value) => value + 1);
  }

  function markDone(stepId: string) {
    setAppState((current) => ({
      ...current,
      stepStatuses: { ...current.stepStatuses, [stepId]: 'done' },
    }));
    syncProgress(stepId, 'done');
  }

  function syncProgress(stepId: string, status: StepStatus) {
    if (!apiBaseUrl || !inviteToken) return;

    void submitRemoteProgress({
      apiBaseUrl,
      inviteToken,
      submission: {
        stepId,
        status: toRemoteStepStatus(status),
      },
    }).catch(() => {
      setRemoteQuestionStatus('Progress was saved here, but Sparkle Suite did not receive it yet.');
    });
  }

  function addQuestion(stepId: string | null, text: string) {
    const normalizedText = text.trim();

    setAppState((current) => ({
      ...current,
      questions: [makeQuestion(normalizedText || text, stepId, 'rep'), ...current.questions],
      stepStatuses: stepId && current.stepStatuses[stepId] !== 'done'
        ? { ...current.stepStatuses, [stepId]: 'needs-help' }
        : current.stepStatuses,
    }));

    if (stepId) {
      syncProgress(stepId, 'needs-help');
    }

    if (!apiBaseUrl || !inviteToken || !normalizedText) return;

    void submitRemoteQuestion({
      apiBaseUrl,
      inviteToken,
      submission: {
        body: normalizedText,
      },
    })
      .then(() => setRemoteQuestionStatus('Sent to Sparkle Suite.'))
      .catch(() => setRemoteQuestionStatus('Your question was saved here, but Sparkle Suite did not receive it yet.'));
  }

  function addNicNacQuestion(question: RepQuestion) {
    setAppState((current) => ({
      ...current,
      questions: [question, ...current.questions],
      stepStatuses: question.stepId && current.stepStatuses[question.stepId] !== 'done'
        ? { ...current.stepStatuses, [question.stepId]: 'needs-help' }
        : current.stepStatuses,
    }));
  }

  function startOver() {
    handleSectionNav();
    resetState();
    setAppState(createInitialState());
  }

  return (
    <main className="app-shell" id="top">
      <header className="topbar">
        <a className="brand-home-link" href="#top">{teamLabel}</a>
        <nav aria-label="Main navigation">
          <a href="#resources" onClick={handleSectionNav}>Resources</a>
          <a href="#questions" onClick={handleSectionNav}>Ask {teamLeadName}</a>
        </nav>
        <NicNac
          selectedStepId={appState.selectedStepId}
          prompt={nicNacPrompt}
          closeSignal={nicNacCloseSignal}
          onPromptHandled={() => setNicNacPrompt(null)}
          onEscalate={addNicNacQuestion}
          teamLeadName={teamLeadName}
        />
        {!inviteToken && (
          <button className="reset-button" type="button" onClick={startOver}>Reset local progress</button>
        )}
      </header>

      <div className="main-grid" id="home">
        {participantName && (
          <div className="participant-banner">
            New Rep Onboarding for {participantName}
          </div>
        )}
        <Dashboard
          participantName={participantName}
          selectedStepId={appState.selectedStepId}
          stepStatuses={appState.stepStatuses}
          questionCount={appState.questions.length}
          teamLeadName={teamLeadName}
          onSelectStep={selectStep}
          onNeedHelp={() => addQuestion(appState.selectedStepId, `I need help with: ${selectedStep.title}`)}
        />
        <StepDetail
          stepId={appState.selectedStepId}
          status={appState.stepStatuses[appState.selectedStepId]}
          onMarkDone={markDone}
          onNeedHelp={addQuestion}
          onAskNicNac={setNicNacPrompt}
          teamLeadName={teamLeadName}
        />
      </div>

      <Resources teamLeadName={teamLeadName} />
      <Questions
        questions={appState.questions}
        remoteQuestionStatus={remoteQuestionStatus}
        teamLeadName={teamLeadName}
      />

      <footer className="site-footer">
        <span>Continue the shine:</span>
        <nav aria-label="Partner links">
          <span>{teamLabel}</span>
          <a href="https://www.yoursparklesuite.com/prelaunch" target="_blank" rel="noreferrer">Sparkle Suite coming soon</a>
        </nav>
      </footer>
    </main>
  );
}
