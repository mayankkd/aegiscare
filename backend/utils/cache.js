let cache = {
  data: null,
  timestamp: null,
};

const CACHE_TTL = 30000; // 30 seconds cache expiry

exports.getDoctorsCache = () => {
  if (cache.data && cache.timestamp && (Date.now() - cache.timestamp < CACHE_TTL)) {
    console.log('✓ [Cache Service] Returning cached doctor listings.');
    return cache.data;
  }
  return null;
};

exports.setDoctorsCache = (data) => {
  cache.data = data;
  cache.timestamp = Date.now();
  console.log('✓ [Cache Service] Doctor listings cached.');
};

exports.invalidateDoctorsCache = () => {
  cache.data = null;
  cache.timestamp = null;
  console.log('✓ [Cache Service] Doctor cache invalidated.');
};
