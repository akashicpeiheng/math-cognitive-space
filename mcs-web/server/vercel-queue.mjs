import { queue, application } from './vercel-app.mjs';
export default queue.handleNodeCallback(async message => {
  if (typeof message?.id !== 'string' || !/^job-[a-f0-9-]+$/.test(message.id)) throw new Error('Invalid MCS queue message');
  await (await application()).jobs.consume(message.id);
}, { visibilityTimeoutSeconds: 300, retry: (_error, metadata) => ({ afterSeconds: Math.min(60, 5 + metadata.deliveryCount * 2) }) });
