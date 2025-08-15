export type Map = {
  name: string;
  description: string;
  order: number;
  imageKey: string;
  videoKey?: string;
  tokenScale: number;
};

export type Chapter = {
  id: string;
  name: string;
  order: number;
  maps: Map[];
};

export type Source = {
  type: "sourcebook" | "adventure" | "basic" | "mappack";
  name: string;
  description: string;
  backgroundImageKey: string;
  chapters: Chapter[];
};

export type OfficialMapData = {
  sources: Source[];
};
