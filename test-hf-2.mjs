import fs from 'fs';

try {
  const envFile = fs.readFileSync('.env', 'utf-8');
  let hfToken = envFile.split('\n').find(l => l.trim().startsWith('VITE_HF_API_KEY=')).split('=')[1].trim();

  async function testModel(url, modelName) {
    console.log(`\nTesting ${url} with model ${modelName}...`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{role: "user", content: "hi"}],
          max_tokens: 10
        })
      });

      console.log(`Status: ${response.status}`);
      if (response.ok) {
         const data = await response.json();
         console.log('✅ Success! Model responded.');
         return true;
      } else {
         console.log(`❌ Failed:`, await response.text());
         return false;
      }
    } catch (e) {
      console.log('Error:', e.message);
      return false;
    }
  }

  async function runAll() {
    // 1. Test the router with the user's chosen model
    await testModel('https://router.huggingface.co/v1/chat/completions', 'meta-llama/Llama-3.3-70B-Instruct');
    
    // 2. Test the router with a small confirmed working model
    await testModel('https://router.huggingface.co/v1/chat/completions', 'mistralai/Mistral-7B-Instruct-v0.3');
    
    // 3. Test the legacy direct model inference endpoint just in case
    await testModel('https://api-inference.huggingface.co/models/meta-llama/Llama-3.3-70B-Instruct/v1/chat/completions', 'meta-llama/Llama-3.3-70B-Instruct');
  }

  runAll();
} catch (e) {
  console.error(e);
}
