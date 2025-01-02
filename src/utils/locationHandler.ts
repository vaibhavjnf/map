interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

export const findLocationInText = (text: string): Location | null => {
  const locationPattern = /\[LOCATION\](.*?)\|(.*?)\|(.*?)\[\/LOCATION\]/g;
  const matches = [...text.matchAll(locationPattern)];
  
  if (matches.length > 0) {
    const [_, name, lat, lng] = matches[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (!isNaN(latitude) && !isNaN(longitude)) {
      return { name, latitude, longitude };
    }
  }
  
  return null;
}

export const formatLocationResponse = (name: string, lat: number, lng: number): string => {
  return `[LOCATION]${name}|${lat}|${lng}[/LOCATION]`;
}
