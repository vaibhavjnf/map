interface PlaceInfo {
  name: string;
  coordinates: [number, number];
  description?: string;
}

export const vietnamPlaces: Record<string, PlaceInfo> = {
  "hoTay": {
    name: "Hồ Tây",
    coordinates: [21.0587, 105.8229],
    description: "Hồ nước ngọt tự nhiên lớn nhất Hà Nội"
  },
  "hoanKiem": {
    name: "Hồ Hoàn Kiếm",
    coordinates: [21.0285, 105.8542],
    description: "Hồ nằm ở trung tâm Hà Nội"
  }
}

export const processUserInput = (message: string) => {
  const locationPattern = /\[LOCATION\](.*?)\|(.*?)\|(.*?)\[\/LOCATION\]/g;
  const matches = [...message.matchAll(locationPattern)];
  
  if (matches.length > 0) {
    return matches.map(match => ({
      name: match[1],
      coordinates: [parseFloat(match[2]), parseFloat(match[3])]
    }));
  }
  
  return null;
}

export const extractLocation = (message: string): string | null => {
  const locationMatch = message.match(/\[LOCATION\](.*?)\|.*?\[\/LOCATION\]/);
  return locationMatch ? locationMatch[1] : null;
}

export const formatLocationResponse = (name: string, lat: number, lng: number): string => {
  return `[LOCATION]${name}|${lat}|${lng}[/LOCATION]`;
}