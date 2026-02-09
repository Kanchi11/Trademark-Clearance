// Simplified metrics for production (Prometheus format ready)

export const searchCounter = {
    inc: (labels: { status: string; source: string }) => {
      console.log('METRIC: search_counter', labels);
    }
  };
  
  export const searchDuration = {
    startTimer: () => {
      const start = Date.now();
      return (labels?: { status: string }) => {
        const duration = Date.now() - start;
        console.log('METRIC: search_duration_ms', duration, labels);
      };
    }
  };
  
  export const usptoApiCalls = {
    inc: (labels: { endpoint: string; status: string }) => {
      console.log('METRIC: uspto_api_calls', labels);
    }
  };
  
  export const cacheHits = {
    inc: (labels: { tier: string }) => {
      console.log('METRIC: cache_hits', labels);
    }
  };
  
  export const cacheMisses = {
    inc: (labels: { tier: string }) => {
      console.log('METRIC: cache_misses', labels);
    }
  };