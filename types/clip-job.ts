export type ClipJob = {
  id: string;
  userId?: string;
  inputKey: string;
  outputKey?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt?: Date | string;
};
