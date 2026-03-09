import cron from 'node-cron'
import type { ScheduledEvent, Context } from 'aws-lambda'
import { handler } from './index'

const dummyEvent: ScheduledEvent = {
  version: '0',
  id: 'local',
  'detail-type': 'Scheduled Event',
  source: 'aws.events',
  account: '000000000000',
  time: new Date().toISOString(),
  region: 'local',
  resources: [],
  detail: {},
}

const dummyContext: Context = {
  callbackWaitsForEmptyEventLoop: true,
  functionName: 'local',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:local:000000000000:function:local',
  memoryLimitInMB: '128',
  awsRequestId: 'local',
  logGroupName: '/aws/lambda/local',
  logStreamName: 'local',
  getRemainingTimeInMillis: () => 60_000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
}

cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Executing handler...`)
  await handler(dummyEvent, dummyContext)
})

console.log('Local scheduler started. Handler runs every minute (* * * * *).')
