// 完整的AI转换API
export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }
  
  try {
    const { text, style = 'trendy' } = req.body;
    
    // 验证输入
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: '请输入要转换的内容' });
    }
    
    // 获取OpenAI API密钥
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: '服务器配置错误',
        hint: 'OpenAI API密钥未设置'
      });
    }
    
    console.log('转换请求：', { length: text.length, style });
    
    // 风格配置
    const styleConfigs = {
      trendy: {
        name: '潮流时尚',
        description: '活泼时尚，使用流行词汇和表情符号',
        emoji: '🌟'
      },
      casual: {
        name: '日常分享',
        description: '亲切自然，像朋友聊天',
        emoji: '☕️'
      },
      professional: {
        name: '专业评测',
        description: '客观详实，有数据支撑',
        emoji: '💼'
      },
      emotional: {
        name: '情感文案',
        description: '温暖治愈，引发共鸣',
        emoji: '💖'
      }
    };
    
    const config = styleConfigs[style] || styleConfigs.trendy;
    
    // 构建提示词
    const prompt = `你是一个专业的小红书文案写手。

要求：
1. 语气：${config.description}
2. 适当使用表情符号（每段1-2个相关emoji）
3. 添加3-5个相关话题标签
4. 结构：吸引人的标题 + 正文 + 话题标签
5. 长度适中，便于阅读

请将以下内容转换成小红书风格：

"${text.substring(0, 500)}${text.length > 500 ? '...' : ''}"`;
    
    // 调用OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是小红书文案专家，擅长创作受欢迎的内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });
    
    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      return res.status(500).json({
        error: 'AI服务错误',
        details: error.error?.message || '请稍后重试'
      });
    }
    
    const data = await openaiResponse.json();
    const convertedText = data.choices[0]?.message?.content || '转换失败';
    
    // 生成图片建议
    const imageSuggestions = [
      '📸 主图：人物+场景，突出主题',
      '🌈 配色：明亮温暖的色调',
      '🎨 构图：使用三分法，主体明确',
      '✨ 细节：添加文字标签增加趣味性'
    ];
    
    // 返回结果
    res.status(200).json({
      success: true,
      convertedText: convertedText,
      suggestions: {
        images: imageSuggestions,
        style: config.name,
        emoji: config.emoji,
        tips: [
          '拍摄时使用自然光',
          '背景简洁不杂乱',
          '多角度拍摄选择最佳'
        ]
      },
      meta: {
        length: convertedText.length,
        model: data.model,
        tokens: data.usage?.total_tokens || 0
      }
    });
    
  } catch (error) {
    console.error('转换错误:', error);
    res.status(500).json({
      error: '服务器错误',
      message: error.message
    });
  }
}
