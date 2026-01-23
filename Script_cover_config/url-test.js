//自动选优版 (追求极速 / 视频下载)
function main(config) {
  const allProxies = config.proxies.map((p) => p.name);
  if (!allProxies.length) return config;

  // 1. 自动组生成函数：使用 url-test (自动测速)
  const createGroup = (name, regex) => {
    const list = allProxies.filter((n) => regex.test(n));
    if (list.length === 0) return null;
    return {
      name: name,
      type: "url-test",     // 【关键】自动测速模式
      proxies: list,
      url: "http://www.gstatic.com/generate_204",
      interval: 300,        // 5分钟测速一次
      tolerance: 50,        // 容差 50ms (防抖动)
      lazy: true
    };
  };

  // 2. 定义区域 (命名为 自动选优)
  const regions = [
    { name: "香港-自动选优", reg: /香港|HK|Hong/i },
    { name: "台湾-自动选优", reg: /台湾|TW|Taiwan/i },
    { name: "日本-自动选优", reg: /日本|JP|Japan/i },
    { name: "新加坡-自动选优", reg: /新加坡|SG|Singapore/i },
    { name: "美国-自动选优", reg: /美国|US|States/i }
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

  // 3. 业务策略组 (引用上面的自动选优组)
  const businessGroups = [
    { 
      name: "通用境外", 
      type: "select", 
      proxies: [...autoRegionGroups.map(g => g.name), "剩余节点", ...allProxies] 
    },
    { 
      name: "GOOGLE", 
      type: "select", 
      proxies: ["通用境外", ...autoRegionGroups.map(g => g.name)] 
    },
    { 
      name: "OPENAI", 
      type: "select", 
      proxies: autoRegionGroups.map(g => g.name).filter(n => /美国|日本|新加坡/.test(n)).concat(["通用境外"])
    },
    { 
      name: "流媒体", 
      type: "select", 
      proxies: ["香港-自动选优", "新加坡-自动选优", "台湾-自动选优", "日本-自动选优", "美国-自动选优", "通用境外"] 
    },
    { 
      name: "国内直连", type: "select", proxies: ["DIRECT", "通用境外"] 
    },
    { 
      name: "广告拦截", type: "select", proxies: ["REJECT", "DIRECT"] 
    }
  ];

  config["proxy-groups"] = [...businessGroups, ...autoRegionGroups, otherGroup];

  // 4. 路由规则 (完全一致)
  config.rules = [
    "GEOIP,PRIVATE,DIRECT,no-resolve",
    "DOMAIN-SUFFIX,ads.goggle.com,广告拦截",
    "DOMAIN-KEYWORD,openai,OPENAI",
    "DOMAIN-KEYWORD,anthropic,OPENAI",
    "DOMAIN-SUFFIX,chatgpt.com,OPENAI",
    "DOMAIN-SUFFIX,google.com,GOOGLE",
    "DOMAIN-SUFFIX,youtube.com,流媒体",
    "DOMAIN-SUFFIX,netflix.com,流媒体",
    "DOMAIN-SUFFIX,telegram.org,通用境外",
    "GEOIP,CN,国内直连",
    "MATCH,通用境外"
  ];

  return config;
}
// 如果导入clash verge rev，下面这行删掉
module.exports = { main };