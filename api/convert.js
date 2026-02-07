// api/convert.js - 完整的推文转小红书AI API
export default async function handler(req, res) {
  // 设置CORS头，允许前端调用
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
    // 获取用户输入
    const { text, style = 'trendy' } = req.body;
    
    // 验证输入
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: '请输入要转换的内容' });
    }
    
    // 获取OpenAI API密钥（从Vercel环境变量）
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API密钥未设置');
      return res.status(500).json({ 
        error: '服务器配置错误',
        hint: '请在Vercel环境变量中设置OPENAI_API_KEY'
      });
    }
    
    console.log('收到转换请求，文本长度:', text.length, '风格:', style);
    
    // 定义不同风格的配置
    const styleConfigs = {
      trendy: {
        name: '潮流时尚',
        description: '活泼时尚，使用流行词汇和表情符号，适合美妆、穿搭、探店',
        emoji: '🌟'
      },
      casual: {
        name: '日常分享', 
        description: '亲切自然，像朋友聊天一样，分享生活点滴',
        emoji: '☕️'
      },
      professional: {
        name: '专业评测',
        description: '客观详实，有数据支撑，适合科技、产品评测',
        emoji: '💼'
      },
      emotional: {
        name: '情感文案',
        description: '温暖治愈，引发情感共鸣，适合情感话题',
        emoji: '💖'
      }
    };
    
    const config = styleConfigs[style] || styleConfigs.trendy;
    
    // 构建给AI的提示词
    const systemPrompt = `你是一个专业的小红书文案写手，擅长创作受欢迎的内容。
    
输出要求：
1. 语气：${config.description}
2. 适当使用表情符号（每段1-2个相关emoji）
3. 添加3-5个相关话题标签
4. 结构：吸引人的标题 + 正文内容 + 话题标签
5. 长度适中，便于阅读和分享

请将用户输入的内容转换成符合小红书平台特点的文案。`;
    
    // 调用OpenAI API
    console.log('正在调用OpenAI API...');
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: `请将以下内容转换成小红书风格：\n\n${text}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API错误:', errorData);
      return res.status(500).json({
        error: 'AI服务暂时不可用',
        details: errorData.error?.message || '请稍后重试'
      });
    }
    
    const data = await openaiResponse.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('OpenAI返回数据格式错误:', data);
      return res.status(500).json({ error: 'AI返回数据格式错误' });
    }
    
    const convertedText = data.choices[0].message.content;
    console.log('转换成功，生成文案长度:', convertedText.length);
    
    // 生成图片建议
    const imageSuggestions = generateImageSuggestions(style);
    
    // 返回成功响应
    res.status(200).json({
      success: true,
      convertedText: convertedText,
      suggestions: {
        images: imageSuggestions,
        style: config.name,
        emoji: config.emoji,
        tips: [
          '📸 拍摄建议：使用自然光，主体突出',
          '🌈 配色建议：选择明亮温暖的色调',
          '🎨 构图建议：使用三分法构图，画面平衡',
          '✨ 细节建议：可添加文字标签增加趣味性'
        ]
      },
      meta: {
        inputLength: text.length,
        outputLength: convertedText.length,
        model: data.model,
        tokens: data.usage?.total_tokens || 0
      }
    });
    
  } catch (error) {
    console.error('服务器内部错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
}

// 生成图片建议
function generateImageSuggestions(style) {
  const suggestions = {
    trendy: [
      '🌟 主图：ins风美照，突出产品或场景',
      '📱 角度：俯拍或45度角，展现细节',
      '🎀 元素：添加手写文字或简约线条',
      '🌈 滤镜：使用明亮清新的滤镜'
    ],
    casual: [
      '☕️ 主图：日常随拍，真实自然',
      '🌞 光线：自然光拍摄，温暖柔和',
      '🏠 场景：家居或咖啡厅等舒适环境',
      '📖 道具：书本、咖啡杯等生活物品'
    ],
    professional: [
      '💼 主图：产品特写，展示细节',
      '⚡️ 布光：专业摄影灯光，突出质感',
      '📊 构图：对比图或使用场景图',
      '🔍 细节：关键部位特写展示'
    ],
    emotional: [
      '💖 主图：氛围感画面，传达情绪',
      '🎨 色调：温暖或冷色调匹配情感',
      '👤 焦点：人物表情或象征性物品',
      '🌌 背景：虚化背景突出主体'
    ]
  };
  
  return suggestions[style] || suggestions.trendy;
}
