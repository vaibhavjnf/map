interface PlaceInfo {
  name: string;
  coordinates: [number, number];
  description?: string;
  type: string;
  region: string;
  aliases?: string[];
}

interface TrainingData {
  landmarks: PlaceInfo[];
  patterns: {
    identity: string[];  // Add this
    findPlace: string[];
    explore: string[];
    navigation: string[];
    information: string[];
  }
}

export const vietnamPlaces: TrainingData = {
  landmarks: [
    {
      name: "Hồ Tây",
      coordinates: [21.0587, 105.8229],
      description: "Hồ nước ngọt tự nhiên lớn nhất ở Hà Nội",
      type: "landmark",
      region: "hanoi",
      aliases: ["Tây Hồ", "Ho Tay", "West Lake"]
    },
    {
      name: "Hồ Hoàn Kiếm",
      coordinates: [21.0285, 105.8542],
      description: "Hồ nằm ở trung tâm Hà Nội, còn gọi là Hồ Gươm",
      type: "landmark",
      region: "hanoi",
      aliases: ["Hồ Gươm", "Ho Guom", "Sword Lake"]
    },

  ],

  patterns: {
    identity: [
      "what is your name",
      "who are you",
      "your name",
      "tên gì",
      "tên bạn là gì",
      "bạn là ai",
      "bạn tên gì"
    ],
    findPlace: [
      "tìm đường đến {place}",
      "chỉ đường tới {place}",
      "làm sao để đến {place}",
      "{place} ở đâu",
      "định vị {place}"
    ],
    explore: [
      "tìm {category} gần đây",
      "có {category} nào quanh đây không",
      "gợi ý {category} quanh đây",
      "show {category} nearby"
    ],
    navigation: [
      "đi từ {start} đến {end}",
      "chỉ đường từ {start} tới {end}",
      "route từ {start} đến {end}"
    ],
    information: [
      "thông tin về {place}",
      "giới thiệu {place}",
      "tell me about {place}"
    ]
  }
}

export const processUserInput = (input: string) => {
  input = input.toLowerCase()
  
  let result = {
    intent: '',
    entities: {}
  }

  if (vietnamPlaces.patterns.identity.some(p => input.includes(p))) {
    result.intent = 'identity'
    return result
  }

  for (const landmark of vietnamPlaces.landmarks) {
    const nameMatches = [landmark.name.toLowerCase(), ...(landmark.aliases || [])]
    if (nameMatches.some(name => input.includes(name.toLowerCase()))) {
      result.intent = 'find_place'
      result.entities = {
        place: landmark.name,
        coordinates: landmark.coordinates,
        description: landmark.description
      }
      return result 
    }
  }

  const categories = ['restaurants', 'cafes', 'parks', 'hospitals', 'schools', 'supermarkets']
  for (const category of categories) {
    if (input.includes(category.toLowerCase())) {
      result.intent = 'explore'
      result.entities = { category }
      return result
    }
  }

  if (vietnamPlaces.patterns.findPlace.some(p => matchPattern(input, p))) {
    result.intent = 'find_place'
  } else if (vietnamPlaces.patterns.navigation.some(p => matchPattern(input, p))) {
    result.intent = 'navigation'
  }

  return result
}

function matchPattern(input: string, pattern: string): boolean {
  const regex = pattern.replace(
    /{(\w+)}/g,
    '.*?'
  )
  return new RegExp(regex).test(input)
}

export const generateResponse = (intent: string, entities: any): string => {
  switch(intent) {
    case 'identity':
      return "My name is AKI BOT, I'm your AI map assistant!"
      
    case 'find_place':
      return `Tôi đã tìm thấy ${entities.place}. Bạn có thể:
        1. Xem thông tin chi tiết
        2. Khám phá địa điểm lân cận
        3. Nhận chỉ đường đến đây`
        
    case 'explore':
      return `Đang tìm ${entities.category} gần vị trí của bạn...`
      
    case 'navigation':
      return `Đang tính toán tuyến đường từ ${entities.start} đến ${entities.end}...`
      
    case 'information':
      if (entities.description) return entities.description.toString();
      return `Đây là thông tin về ${entities.place}`
        
    default:
      return `Xin lỗi, tôi không hiểu yêu cầu của bạn. Bạn có thể thử:
- Tìm một địa điểm cụ thể
- Khám phá địa điểm xung quanh
- Hỏi chỉ đường 
- Tìm hiểu thông tin về một địa điểm`
  }
}