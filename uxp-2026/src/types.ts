export interface RawMarker {
  guid: string;
  name: string;
  comment: string;
  startSeconds: number;
  durationSeconds: number;
  startTicks: string;
  endTicks: string;
  durationTicks: string;
  startTimecode: string;
  durationText: string;
}

export interface ReviewMarker extends RawMarker {
  index: number;
  mediaType: "image" | "video";
  assetFileName: string;
  mediaAvailable?: boolean;
  posterFileName?: string;
}

export interface MarkerReplacement {
  index: number;
  guid: string;
  startTicks: string;
  durationTicks: string;
  originalComment: string;
  polishedComment: string;
}

export interface AiSettings {
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiKey: string;
  prompt: string;
}

export interface SequenceContext {
  project: any;
  sequence: any;
  projectName: string;
  sequenceName: string;
  markers: RawMarker[];
}

export interface OutputContext {
  root: any;
  assets: any;
  rootPath: string;
}
