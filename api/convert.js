// 超简单测试版本
export default async function handler(req, res) {
  console.log('API被调用了！');
  
  // 允许所有来源
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 测试响应
  return res.status(200).json({
    success: true,
    message: '🎉 API正常工作！',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
    hasKey: !!process.env.OPENAI_API_KEY,
    env: process.env.NODE_ENV
  });
}
