<template>
    <div class="search-container">
      <div class="search-box">
        <input
          type="text"
          v-model="searchQuery"
          @input="handleInput"
          @focus="showResults = true"
          @blur="handleBlur"
          placeholder="Tìm kiếm địa điểm..."
          class="search-input"
        />
        <span class="material-icons search-icon">search</span>
      </div>
      <div v-if="showResults && results.length > 0" class="search-results">
        <div
          v-for="result in results"
          :key="result.place_id"
          class="result-item"
          @click="selectLocation(result)"
        >
          <span class="material-icons">location_on</span>
          <div class="result-text">{{ result.display_name }}</div>
        </div>
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref } from 'vue'
  import debounce from 'lodash/debounce'
  
  interface SearchResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
  }
  
  export default defineComponent({
    name: 'SearchBox',
    emits: ['select-location'],
    setup(_, { emit }) {
      const searchQuery = ref('')
      const results = ref<SearchResult[]>([])
      const showResults = ref(false)
  
      const handleBlur = () => {
        setTimeout(() => {
          showResults.value = false
        }, 200)
      }
  
      const searchLocation = async (query: string) => {
        if (query.length < 3) {
          results.value = []
          return
        }
  
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
          )
          results.value = await response.json()
        } catch (error) {
          console.error('Search error:', error)
        }
      }
  
      const handleInput = debounce(() => {
        searchLocation(searchQuery.value)
      }, 300)
  
      const selectLocation = (result: SearchResult) => {
        emit('select-location', {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          name: result.display_name
        })
        showResults.value = false
        searchQuery.value = ''
        results.value = []
      }
  
      return {
        searchQuery,
        results,
        showResults,
        handleInput,
        handleBlur,
        selectLocation
      }
    }
  })
  </script>
  
  <style scoped>
  .search-container {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 300px; 
    display: flex;
    align-items: center;
  }
  
  .search-box {
    width: 100%;
    display: flex;
    align-items: center;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
  
  .search-input {
    width: 100%;
    padding: 8px 35px 8px 15px; 
    border: none;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
  }
  
  .search-icon {
    position: absolute;
    right: 10px;
    color: #666;
    font-size: 20px;
  }
  
  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 5px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-height: 300px;
    overflow-y: auto;
  }
  
  .result-item {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
  }
  
  .result-item:last-child {
    border-bottom: none;
  }
  
  .result-item:hover {
    background: #f5f5f5;
  }
  
  .result-item .material-icons {
    margin-right: 10px;
    color: #666;
    font-size: 20px;
  }
  
  .result-text {
    font-size: 13px;
    color: #333;
  }

  @media (max-width: 768px) {
    .search-container {
      top: 10px;
      left: 30px;
      right: 10px;
      width: calc(100% - 60px);
      transform: none;
      width: 75%;
      max-width: 260px; 
      left: 50%;
      transform: translateX(-50%);
    }
  
    .search-results {
      max-height: 50vh; 
      max-height: 40vh;
    }
  }
  </style>