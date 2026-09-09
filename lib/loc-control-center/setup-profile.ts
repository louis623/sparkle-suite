import 'server-only'
import {z} from 'zod'
import {upsertPrelaunchLaunchSetupProfile,PrelaunchSetupProfileConflictError} from '@/lib/prelaunch/setup-profiles'
import {LocBridgeError} from './security'
const schema=z.object({product:z.literal('suite'),launchBuildId:z.uuid(),expectedUpdatedAt:z.iso.datetime({offset:true}).nullable(),businessName:z.string().trim().min(1).max(240),publicSiteGoal:z.string().max(4000).optional(),customDomain:z.string().max(240).nullable().optional(),primarySocialUrl:z.string().max(2000).nullable().optional(),secondarySocialUrl:z.string().max(2000).nullable().optional(),shopUrl:z.string().max(2000).nullable().optional(),brandNotes:z.string().max(4000).optional(),mustHaveLaunchNotes:z.string().max(4000).optional(),openQuestions:z.array(z.string().max(1000)).max(50).optional(),status:z.enum(['draft','ready','locked']).optional()}).strict()
export async function saveLocSetupProfile(input:Record<string,unknown>) {
 const {product,...parsed}=schema.parse(input);void product
 try{return {ok:true,profile:await upsertPrelaunchLaunchSetupProfile(parsed)}}
 catch(error){if(error instanceof PrelaunchSetupProfileConflictError)throw new LocBridgeError(409,error.message);throw error}
}
