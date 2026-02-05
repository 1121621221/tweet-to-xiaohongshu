// Vercel Serverless Function - 安全处理AI转换
export default async function handler(req, res) {
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
    
    // 获取OpenAI API密钥（在Vercel环境变量中设置）
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API密钥未设置');
      return res.status(500).json({ error: '服务器配置错误' });
    }
    
    // 根据风格设置提示词
    const stylePrompts = {
      trendy: "潮流时尚，紧跟热点，适合美妆、穿搭、探店内容",
      casual: "日常分享，轻松自然，像朋友聊天一样亲切",
      professional: "专业评测，客观详实，适合科技、产品、知识分享",
      emotional: "情感共鸣，温暖治愈，适合情感、生活感悟内容"
    };
    
    const prompt = `你是一个专业的小红书文案写手。请将用户输入的内容转换成小红书风格的文案。

要求：
1. 语气亲切活泼，像和朋友聊天一样
2. 适当使用emoji表情（每段1-2个）
3. 添加3-5个相关话题标签
4. 段落清晰，易读性强
5. 风格：${stylePrompts[style] || stylePrompts.trendy}

用户输入内容：
${text}

请输出转换后的小红书文案：`;
    
    // 调用OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // 或 'gpt-4' 如果可用
        messages: [
          {
            role: 'system',
            content: '你是一个专业的小红书文案写手，擅长将各种内容转换成受欢迎的小红书风格。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    const data = await openaiResponse.json();
    
    if (data.error) {
      console.error('OpenAI API错误:', data.error);
      return res.status(500).json({ 
        error: 'AI服务错误',
        details: data.error.message 
      });
    }
    
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: 'AI返回数据格式错误' });
    }
    
    const convertedText = data.choices[0].message.content;
    
    // 提取关键词用于图片建议
    const keywords = extractKeywords(text);
    
    // 生成图片建议
    const imageSuggestions = generateImageSuggestions(keywords, style);
    
    // 返回结果
    res.status(200).json({
      success: true,
      convertedText: convertedText,
      imageSuggestions: imageSuggestions,
      keywords: keywords.slice(0, 3),
      usage: data.usage,
      model: data.model
    });
    
  } catch (error) {
    console.error('服务器错误:', error);
    res.status(500).json({ 
      error: '服务器内部错误',
      message: error.message 
    });
  }
}

// 提取关键词（简化版）
function extractKeywords(text) {
  // 移除特殊字符，转为小写
  const cleanedText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
  const words = cleanedText.split(/\s+/).filter(word => word.length > 1);
  
  // 简单的中文停用词列表
  const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
  
  // 过滤停用词，取前5个
  const keywords = words
    .filter(word => !stopWords.includes(word))
    .slice(0, 5);
  
  return keywords.length > 0 ? keywords : ['生活', '分享', '记录'];
}

// 生成图片建议
function generateImageSuggestions(keywords, style) {
  const styleThemes = {
    trendy: ['ins风', '简约时尚', '高级感'],
    casual: ['日常随拍', '生活记录', '自然光'],
    professional: ['产品特写', '细节展示', '对比图'],
    emotional: ['氛围感', '情绪画面', '故事感']
  };
  
  const themes = styleThemes[style] || styleThemes.trendy;
  
  return {
    themes: themes,
    keywords: keywords,
    suggestions: [
      '📸 主图：人物+场景，突出主题',
      '🌈 配色：选择与风格匹配的色调',
      '🎨 构图：使用三分法，主体明确',
      '✨ 细节：添加文字标签或贴纸增加趣味性'
    ],
    examples: keywords.map(keyword => `${keyword}相关场景照`)
  };
}