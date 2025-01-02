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