// 故障转移版 (SSR 推荐 / 稳定防封)
function main(config) {
  const allProxies = config.proxies.map((p) => p.name);
  if (!allProxies.length) return config;

  // 1. 自动组生成函数：使用 fallback (故障转移)
  const createGroup = (name, regex) => {
    const list = allProxies.filter((n) => regex.test(n));
    if (list.length === 0) return null;
    return {
      name: name,
      type: "fallback",     // 【关键】故障转移模式
      proxies: list,
      url: "http://www.gstatic.com/generate_204",
      interval: 600,        // 10分钟检测一次，减少资源消耗
      lazy: true
    };
  };

  // 2. 定义区域 (命名为 故障转移)
  const regions = [
    { name: "香港-故障转移", reg: /香港|HK|Hong/i },
    { name: "台湾-故障转移", reg: /台湾|TW|Taiwan/i },
    { name: "日本-故障转移", reg: /日本|JP|Japan/i },
    { name: "新加坡-故障转移", reg: /新加坡|SG|Singapore/i },
    { name: "美国-故障转移", reg: /美国|US|States/i }
  ];

  const autoRegionGroups = regions.map(r => createGroup(r.name, r.reg)).filter(Boolean);
  
  // 计算剩余节点
  const usedProxiesSet = new Set(autoRegionGroups.flatMap(g => g.proxies));
  const otherProxies = allProxies.filter(name => !usedProxiesSet.has(name));
  const otherGroup = {
    name: "剩余节点",
    type: "select",
    proxies: otherProxies.length > 0 ? otherProxies : ["DIRECT"]
  };

  // 3. 业务策略组 (引用上面的故障转移组)
  const businessGroups = [
    { 
      name: "通用境外", 
      type: "select", 
      proxies: [...autoRegionGroups.map(g => g.name), "剩余节点", ...allProxies] 
    },
    { 
      name: "GOOGLE", 
      type: "select", 
      proxies: ["新加坡-故障转移", "日本-故障转移", "香港-故障转移", "台湾-故障转移", "美国-故障转移", "通用境外"] 
    },// 优先新加坡日本，解锁Gemini
    { 
      name: "OPENAI", 
      type: "select", 
      // AI 优先美国日本，保持 IP 稳定
      proxies: autoRegionGroups.map(g => g.name).filter(n => /美国|日本|新加坡/.test(n)).concat(["通用境外"])
    },
    { 
      name: "流媒体", 
      type: "select", 
      proxies: ["香港-故障转移", "新加坡-故障转移", "台湾-故障转移", "日本-故障转移", "美国-故障转移", "通用境外"] 
    },
    { 
      name: "国内直连", type: "select", proxies: ["DIRECT", "通用境外"] 
    },
    { 
      name: "广告拦截", type: "select", proxies: ["REJECT", "DIRECT"] 
    }
  ];

  config["proxy-groups"] = [...businessGroups, ...autoRegionGroups, otherGroup];

  // 4. 路由规则 (黄金顺序)
  config.rules = [
    "GEOIP,PRIVATE,DIRECT,no-resolve",           // 局域网直连
    "DOMAIN-SUFFIX,ads.goggle.com,广告拦截",      // 广告拦截
    "DOMAIN-KEYWORD,openai,OPENAI",              // AI 服务
    "DOMAIN-KEYWORD,anthropic,OPENAI",
    "DOMAIN-SUFFIX,chatgpt.com,OPENAI",
    "DOMAIN-SUFFIX,google.com,GOOGLE",           // Google 服务
    "DOMAIN-SUFFIX,youtube.com,流媒体",           // 流媒体
    "DOMAIN-SUFFIX,netflix.com,流媒体",
    "DOMAIN-SUFFIX,telegram.org,通用境外",        // 社交软件
    "GEOIP,CN,国内直连",                         // 【关键】国内 IP 直连 (必须放在国外规则之后)
    "MATCH,通用境外"                             // 兜底
  ];

  return config;
}
// 如果导入clash verge rev，下面这行删掉
module.exports = { main };