import axios from 'axios';

// Ensure default test key is present in environment
process.env.RENTCAST_API_KEY = process.env.RENTCAST_API_KEY || 'test_mock_key';

// 1. RentCast Active Network Firewall Interceptor
// Throws immediately if any outgoing request targets api.rentcast.io
axios.interceptors.request.use((config) => {
  const url = (config.baseURL || '') + (config.url || '');
  if (url.includes('api.rentcast.io')) {
    throw new Error(`CRITICAL INTEGRITY VIOLATION: Live RentCast API call blocked in test environment: ${config.url}`);
  }
  return config;
});

