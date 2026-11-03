const BASE_URL = 'http://localhost:5000/api';

async function runBenchmark() {
  console.log('=====================================================');
  console.log('RUNNING CONCURRENT PERFORMANCE & BENCHMARK SUITE');
  console.log('=====================================================');

  const concurrentUsers = 50;
  const requestsPerUser = 2; // Total 100 concurrent read/catalog operations
  const totalRequests = concurrentUsers * requestsPerUser;

  console.log(`Simulated Concurrent Users: ${concurrentUsers}`);
  console.log(`Total Scheduled Requests: ${totalRequests}`);
  console.log('Target Endpoints: GET /api/products, GET /api/categories, GET /api/health\n');

  const endpoints = [
    `${BASE_URL}/products?limit=12`,
    `${BASE_URL}/categories`,
    `${BASE_URL}/health`,
  ];

  const latencies = [];
  let successCount = 0;
  let errorCount = 0;

  const startTime = Date.now();

  const makeRequest = async (i) => {
    const url = endpoints[i % endpoints.length];
    const reqStart = Date.now();
    try {
      const res = await fetch(url);
      const reqDuration = Date.now() - reqStart;
      latencies.push(reqDuration);
      if (res.status >= 200 && res.status < 400) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (err) {
      errorCount++;
    }
  };

  // Launch all concurrent requests simultaneously
  const promises = [];
  for (let i = 0; i < totalRequests; i++) {
    promises.push(makeRequest(i));
  }

  await Promise.all(promises);

  const totalDurationMs = Date.now() - startTime;

  // Compute statistics
  latencies.sort((a, b) => a - b);
  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;
  const sumLatency = latencies.reduce((a, b) => a + b, 0);
  const avgLatency = latencies.length ? (sumLatency / latencies.length).toFixed(1) : 0;
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const requestsPerSec = ((totalRequests / totalDurationMs) * 1000).toFixed(1);

  console.log('-----------------------------------------------------');
  console.log('BENCHMARK RESULTS:');
  console.log('-----------------------------------------------------');
  console.log(`Total Time Elapsed: ${totalDurationMs} ms`);
  console.log(`Successful Requests: ${successCount} / ${totalRequests} (${((successCount / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed Requests: ${errorCount}`);
  console.log(`Throughput: ${requestsPerSec} requests/sec`);
  console.log(`Average Latency: ${avgLatency} ms`);
  console.log(`Min Latency: ${minLatency} ms`);
  console.log(`Max Latency: ${maxLatency} ms`);
  console.log(`p50 Latency: ${p50} ms`);
  console.log(`p95 Latency: ${p95} ms`);
  console.log(`p99 Latency: ${p99} ms`);
  console.log('=====================================================\n');
}

runBenchmark();
