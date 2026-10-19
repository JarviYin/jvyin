export type Page = 'agents' | 'finance';

export interface Evidence {
  label: string;
  url: string;
  publisher: string;
  date?: string;
}

export interface EcosystemEntity {
  id: string;
  name: string;
  url: string;
  summary: string;
  pages: Page[];
  sector: string;
  roles: string[];
  chains: string[];
  stage: string;
  capabilities: string[];
  evidence: Evidence[];
  reviewedAt: string;
}

export interface LandscapeItem {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string;
  summary: string;
  topic: string;
  kind: 'research' | 'release' | 'report';
  evidenceLevel: 'primary' | 'secondary' | 'methodology';
}

export const agentSectors = [
  { id: 'agent-wallets', label: '钱包与账户', description: '钱包、密钥与账户权限，让软件代理在明确边界内使用资金。' },
  { id: 'agent-execution', label: '交易与执行', description: '提供可编程交易、市场数据、路由或托管交易接口；功能可用不代表代理自主交易已被验证。' },
  { id: 'agent-frameworks', label: '代理框架', description: '面向代理的身份、任务协作、工具调用与支付协议。' },
  { id: 'agent-observability', label: '可观测性', description: '公开链上或协议层的活动索引；聚合指标不等同于真实用户或代理使用量。' },
  { id: 'agent-payment-protocols', label: '支付协议', description: '面向机器结算的 x402、MPP 与代理支付授权协议。' },
  { id: 'agent-identity', label: '身份与信誉', description: '代理身份、发现与信誉标准；标准发布不代表广泛采用。' },
  { id: 'agent-intents', label: '意图与执行', description: '把用户或代理意图交给受约束的求解器与执行路径。' },
] as const;

export const financeSectors = [
  { id: 'stablecoins', label: '稳定币', description: '法币、加密抵押或合成稳定价值资产及其发行方。' },
  { id: 'rwa', label: 'RWA', description: '代币化国债、信贷、基金和其他链上映射资产。' },
  { id: 'dex-perps', label: 'DEX 与永续', description: '现货 AMM、订单簿、聚合路由和去中心化衍生品。' },
  { id: 'lending', label: '借贷', description: '超额抵押、隔离池和机构信贷协议。' },
  { id: 'asset-management', label: '资产管理', description: '链上金库、收益路由、策略与再质押基础设施。' },
  { id: 'issuance-custody', label: '发行与托管', description: '资产代币化、机构托管和合规结算基础设施。' },
  { id: 'oracles-bridges', label: '预言机与跨链', description: '价格、储备证明、跨链消息与流动性传递。' },
] as const;

const reviewedAt = '2026-10-18';
const official = (label: string, url: string, publisher: string): Evidence => ({ label, url, publisher });

export const entities: EcosystemEntity[] = [
  { id: 'okx', name: 'OKX', url: 'https://www.okx.com/web3', summary: '提供 Web3 钱包、DEX 聚合与面向代理的钱包操作能力。', pages: ['agents', 'finance'], sector: 'agent-wallets', roles: ['wallet', 'swap-routing'], chains: ['multi-chain'], stage: 'active', capabilities: ['Agentic Wallet', 'DEX aggregation'], evidence: [official('Agentic Wallet announcement', 'https://www.okx.com/en-us/learn/agentic-wallet', 'OKX')], reviewedAt },
  { id: 'binance', name: 'Binance', url: 'https://www.binance.com/en/blog/ecosystem/5991233187660196794', summary: '交易所公布了 Agent OS，用于将代理连接到其产品与工具环境。', pages: ['agents'], sector: 'agent-execution', roles: ['exchange', 'agent-platform'], chains: ['centralized exchange'], stage: 'announced', capabilities: ['Agent OS'], evidence: [official('Binance Agent OS announcement', 'https://www.binance.com/en/blog/ecosystem/5991233187660196794', 'Binance')], reviewedAt },
  { id: 'coinbase', name: 'Coinbase', url: 'https://www.coinbase.com/developer-platform/products/agentkit', summary: 'Coinbase Developer Platform 的 AI Agents 文档覆盖 AgentKit、钱包与受控链上交互能力。', pages: ['agents', 'finance'], sector: 'agent-wallets', roles: ['wallet', 'onchain-tools'], chains: ['Base', 'Ethereum'], stage: 'active', capabilities: ['AgentKit', 'CDP wallets'], evidence: [official('AI Agents overview', 'https://docs.cdp.coinbase.com/ai-agents/overview', 'Coinbase Developer Platform')], reviewedAt },
  { id: 'circle', name: 'Circle', url: 'https://www.circle.com/usdc', summary: 'USDC 发行方，提供可编程美元、跨链转移协议和面向开发者的结算接口。', pages: ['agents', 'finance'], sector: 'stablecoins', roles: ['stablecoin-issuer', 'payments'], chains: ['multi-chain'], stage: 'active', capabilities: ['USDC', 'CCTP'], evidence: [official('USDC overview', 'https://www.circle.com/usdc', 'Circle'), official('CCTP docs', 'https://developers.circle.com/cctp', 'Circle')], reviewedAt },
  { id: 'tether', name: 'Tether', url: 'https://tether.to/en/transparency/', summary: 'USDT 发行方，公开储备透明度信息与各链流通供给。', pages: ['finance'], sector: 'stablecoins', roles: ['stablecoin-issuer'], chains: ['multi-chain'], stage: 'active', capabilities: ['USDT', 'transparency reporting'], evidence: [official('Transparency', 'https://tether.to/en/transparency/', 'Tether')], reviewedAt },
  { id: 'ethena', name: 'Ethena', url: 'https://docs.ethena.fi/', summary: '发行以对冲策略为核心设计的合成美元 USDe，并提供质押版本。', pages: ['finance'], sector: 'stablecoins', roles: ['synthetic-dollar-issuer'], chains: ['Ethereum'], stage: 'active', capabilities: ['USDe', 'sUSDe'], evidence: [official('Protocol documentation', 'https://docs.ethena.fi/', 'Ethena')], reviewedAt },
  { id: 'sky', name: 'Sky', url: 'https://docs.sky.money/', summary: 'Sky 生态提供 USDS、去中心化借贷与储蓄模块。', pages: ['finance'], sector: 'stablecoins', roles: ['stablecoin-protocol', 'lending'], chains: ['Ethereum'], stage: 'active', capabilities: ['USDS', 'Sky Savings Rate'], evidence: [official('Sky docs', 'https://docs.sky.money/', 'Sky')], reviewedAt },
  { id: 'paypal', name: 'PayPal USD', url: 'https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd', summary: '由 PayPal 推出的美元稳定币产品。', pages: ['finance'], sector: 'stablecoins', roles: ['stablecoin-issuer'], chains: ['Ethereum', 'Solana'], stage: 'active', capabilities: ['PYUSD'], evidence: [official('PYUSD product page', 'https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd', 'PayPal')], reviewedAt },
  { id: 'ondo', name: 'Ondo Finance', url: 'https://docs.ondo.finance/', summary: '提供代币化美国国债及其他机构级链上资产产品。', pages: ['finance'], sector: 'rwa', roles: ['tokenized-securities'], chains: ['Ethereum', 'Solana', 'XRP Ledger'], stage: 'active', capabilities: ['OUSG', 'USDY'], evidence: [official('Ondo documentation', 'https://docs.ondo.finance/', 'Ondo Finance')], reviewedAt },
  { id: 'blackrock-buidl', name: 'BlackRock BUIDL', url: 'https://securitize.io/blackrock/buidl', summary: 'BlackRock 的链上代币化基金，由 Securitize 提供代币化基础设施。', pages: ['finance'], sector: 'rwa', roles: ['tokenized-fund'], chains: ['Ethereum'], stage: 'active', capabilities: ['tokenized treasury fund'], evidence: [official('BUIDL fund page', 'https://securitize.io/blackrock/buidl', 'Securitize')], reviewedAt },
  { id: 'securitize', name: 'Securitize', url: 'https://www.securitize.io/', summary: '为受监管资产提供代币化、转让限制与基金管理服务。', pages: ['finance'], sector: 'issuance-custody', roles: ['tokenization', 'transfer-agent'], chains: ['Ethereum', 'Polygon', 'Aptos'], stage: 'active', capabilities: ['digital transfer agent', 'tokenization'], evidence: [official('Platform overview', 'https://www.securitize.io/', 'Securitize')], reviewedAt },
  { id: 'superstate', name: 'Superstate', url: 'https://www.superstate.com/', summary: '提供注册基金与链上代币化基金份额的产品架构。', pages: ['finance'], sector: 'rwa', roles: ['asset-manager', 'tokenized-funds'], chains: ['Ethereum', 'Solana'], stage: 'active', capabilities: ['USTB', 'USCC'], evidence: [official('Fund overview', 'https://www.superstate.com/', 'Superstate')], reviewedAt },
  { id: 'maple', name: 'Maple Finance', url: 'https://docs.maple.finance/', summary: '提供链上机构信贷与超额抵押借贷市场。', pages: ['finance'], sector: 'lending', roles: ['institutional-credit', 'lending'], chains: ['Ethereum', 'Solana'], stage: 'active', capabilities: ['institutional lending'], evidence: [official('Maple docs', 'https://docs.maple.finance/', 'Maple Finance')], reviewedAt },
  { id: 'centrifuge', name: 'Centrifuge', url: 'https://docs.centrifuge.io/', summary: '提供将现实世界资产接入链上信贷与基金产品的基础设施。', pages: ['finance'], sector: 'rwa', roles: ['asset-origination', 'tokenization'], chains: ['Ethereum', 'Base', 'Arbitrum'], stage: 'active', capabilities: ['asset tokenization', 'pools'], evidence: [official('Centrifuge docs', 'https://docs.centrifuge.io/', 'Centrifuge')], reviewedAt },
  { id: 'aave', name: 'Aave', url: 'https://aave.com/', summary: '非托管借贷协议，支持多资产抵押与借贷市场。', pages: ['finance'], sector: 'lending', roles: ['lending'], chains: ['Ethereum', 'Base', 'Arbitrum', 'Avalanche'], stage: 'active', capabilities: ['supply', 'borrow'], evidence: [official('Aave docs', 'https://aave.com/docs', 'Aave')], reviewedAt },
  { id: 'morpho', name: 'Morpho', url: 'https://docs.morpho.org/', summary: '提供无需许可的借贷市场与金库管理框架。', pages: ['finance'], sector: 'lending', roles: ['lending', 'vaults'], chains: ['Ethereum', 'Base'], stage: 'active', capabilities: ['markets', 'vaults'], evidence: [official('Morpho docs', 'https://docs.morpho.org/', 'Morpho')], reviewedAt },
  { id: 'spark', name: 'Spark', url: 'https://docs.spark.fi/', summary: '提供稳定币借贷、储蓄与流动性模块。', pages: ['finance'], sector: 'lending', roles: ['lending', 'savings'], chains: ['Ethereum', 'Base', 'Arbitrum'], stage: 'active', capabilities: ['SparkLend', 'Savings'], evidence: [official('Spark docs', 'https://docs.spark.fi/', 'Spark')], reviewedAt },
  { id: 'euler', name: 'Euler', url: 'https://docs.euler.finance/', summary: '模块化借贷协议，允许创建隔离借贷市场。', pages: ['finance'], sector: 'lending', roles: ['lending'], chains: ['Ethereum', 'Base'], stage: 'active', capabilities: ['Euler Vault Kit'], evidence: [official('Euler docs', 'https://docs.euler.finance/', 'Euler')], reviewedAt },
  { id: 'uniswap', name: 'Uniswap', url: 'https://docs.uniswap.org/', summary: '提供 AMM 现货流动性协议和跨链交换接口。', pages: ['agents', 'finance'], sector: 'dex-perps', roles: ['spot-dex', 'liquidity'], chains: ['Ethereum', 'Base', 'Arbitrum', 'Optimism', 'Polygon'], stage: 'active', capabilities: ['AMM', 'Universal Router'], evidence: [official('Uniswap docs', 'https://docs.uniswap.org/', 'Uniswap Labs')], reviewedAt },
  { id: 'curve', name: 'Curve', url: 'https://docs.curve.finance/', summary: '专注稳定资产与相关资产兑换的 AMM 协议。', pages: ['finance'], sector: 'dex-perps', roles: ['spot-dex', 'liquidity'], chains: ['multi-chain'], stage: 'active', capabilities: ['stable-swap AMM'], evidence: [official('Curve docs', 'https://docs.curve.finance/', 'Curve')], reviewedAt },
  { id: 'jupiter', name: 'Jupiter', url: 'https://station.jup.ag/docs', summary: 'Solana 上的流动性聚合、限价单与永续产品入口。', pages: ['agents', 'finance'], sector: 'dex-perps', roles: ['aggregator', 'perpetuals'], chains: ['Solana'], stage: 'active', capabilities: ['swap routing', 'perpetuals'], evidence: [official('Jupiter docs', 'https://station.jup.ag/docs', 'Jupiter')], reviewedAt },
  { id: '0x', name: '0x', url: 'https://0x.org/docs', summary: '提供聚合 DEX 流动性和可嵌入交换 API。', pages: ['agents', 'finance'], sector: 'agent-execution', roles: ['dex-aggregation', 'developer-api'], chains: ['EVM'], stage: 'active', capabilities: ['Swap API'], evidence: [official('0x docs', 'https://0x.org/docs', '0x')], reviewedAt },
  { id: 'hyperliquid', name: 'Hyperliquid', url: 'https://hyperliquid.gitbook.io/hyperliquid-docs', summary: '提供链上订单簿式现货与永续交易基础设施。', pages: ['agents', 'finance'], sector: 'dex-perps', roles: ['perpetuals', 'spot-dex'], chains: ['Hyperliquid L1'], stage: 'active', capabilities: ['order book', 'perpetuals API'], evidence: [official('Hyperliquid docs', 'https://hyperliquid.gitbook.io/hyperliquid-docs', 'Hyperliquid')], reviewedAt },
  { id: 'dydx', name: 'dYdX', url: 'https://docs.dydx.trade/', summary: '提供基于独立链的去中心化永续合约交易。', pages: ['agents', 'finance'], sector: 'dex-perps', roles: ['perpetuals'], chains: ['dYdX Chain'], stage: 'active', capabilities: ['perpetual markets', 'indexer API'], evidence: [official('dYdX docs', 'https://docs.dydx.trade/', 'dYdX')], reviewedAt },
  { id: 'gmX', name: 'GMX', url: 'https://docs.gmx.io/', summary: '在 Arbitrum 和 Avalanche 提供现货与永续交易协议。', pages: ['finance'], sector: 'dex-perps', roles: ['perpetuals'], chains: ['Arbitrum', 'Avalanche'], stage: 'active', capabilities: ['perpetuals', 'GLV vaults'], evidence: [official('GMX docs', 'https://docs.gmx.io/', 'GMX')], reviewedAt },
  { id: 'pendle', name: 'Pendle', url: 'https://docs.pendle.finance/', summary: '将收益资产拆分为本金与收益两类代币，支持收益率交易。', pages: ['finance'], sector: 'asset-management', roles: ['yield-trading'], chains: ['Ethereum', 'Arbitrum', 'BNB Chain'], stage: 'active', capabilities: ['yield tokenization'], evidence: [official('Pendle docs', 'https://docs.pendle.finance/', 'Pendle')], reviewedAt },
  { id: 'yearn', name: 'Yearn', url: 'https://docs.yearn.fi/', summary: '提供策略金库，用于自动化资金部署与收益管理。', pages: ['finance'], sector: 'asset-management', roles: ['vaults', 'strategy-management'], chains: ['Ethereum', 'Base', 'Arbitrum'], stage: 'active', capabilities: ['vaults'], evidence: [official('Yearn docs', 'https://docs.yearn.fi/', 'Yearn')], reviewedAt },
  { id: 'etherfi', name: 'ether.fi', url: 'https://ether.fi/', summary: '提供流动性再质押和原生再质押相关产品。', pages: ['finance'], sector: 'asset-management', roles: ['liquid-restaking'], chains: ['Ethereum'], stage: 'active', capabilities: ['liquid restaking'], evidence: [official('ether.fi overview', 'https://ether.fi/', 'ether.fi')], reviewedAt },
  { id: 'lido', name: 'Lido', url: 'https://docs.lido.fi/', summary: '提供以 stETH 为代表的流动性质押协议。', pages: ['finance'], sector: 'asset-management', roles: ['liquid-staking'], chains: ['Ethereum'], stage: 'active', capabilities: ['liquid staking'], evidence: [official('Lido docs', 'https://docs.lido.fi/', 'Lido')], reviewedAt },
  { id: 'chainlink', name: 'Chainlink', url: 'https://docs.chain.link/', summary: '提供价格数据、储备证明、跨链互操作与自动化服务。', pages: ['agents', 'finance'], sector: 'oracles-bridges', roles: ['oracle', 'cross-chain'], chains: ['multi-chain'], stage: 'active', capabilities: ['Data Feeds', 'CCIP', 'Proof of Reserve'], evidence: [official('Chainlink docs', 'https://docs.chain.link/', 'Chainlink')], reviewedAt },
  { id: 'pyth', name: 'Pyth Network', url: 'https://docs.pyth.network/', summary: '向链上应用提供低延迟市场数据和价格更新。', pages: ['finance'], sector: 'oracles-bridges', roles: ['oracle'], chains: ['multi-chain'], stage: 'active', capabilities: ['price feeds'], evidence: [official('Pyth docs', 'https://docs.pyth.network/', 'Pyth Network')], reviewedAt },
  { id: 'layerzero', name: 'LayerZero', url: 'https://docs.layerzero.network/', summary: '提供跨链消息传递协议，用于应用间状态和资产指令传递。', pages: ['finance'], sector: 'oracles-bridges', roles: ['cross-chain-messaging'], chains: ['multi-chain'], stage: 'active', capabilities: ['omnichain messaging'], evidence: [official('LayerZero docs', 'https://docs.layerzero.network/', 'LayerZero')], reviewedAt },
  { id: 'wormhole', name: 'Wormhole', url: 'https://wormhole.com/docs/', summary: '提供跨链消息、资产转移与验证网络。', pages: ['finance'], sector: 'oracles-bridges', roles: ['cross-chain-messaging', 'bridge'], chains: ['multi-chain'], stage: 'active', capabilities: ['Token Bridge', 'messaging'], evidence: [official('Wormhole docs', 'https://wormhole.com/docs/', 'Wormhole')], reviewedAt },
  { id: 'fireblocks', name: 'Fireblocks', url: 'https://www.fireblocks.com/platform/', summary: '为机构提供数字资产托管、钱包基础设施与交易操作控制。', pages: ['finance'], sector: 'issuance-custody', roles: ['custody', 'wallet-infrastructure'], chains: ['multi-chain'], stage: 'active', capabilities: ['MPC custody', 'policy controls'], evidence: [official('Platform', 'https://www.fireblocks.com/platform/', 'Fireblocks')], reviewedAt },
  { id: 'anchorage', name: 'Anchorage Digital', url: 'https://www.anchorage.com/', summary: '提供受监管的数字资产托管与机构服务。', pages: ['finance'], sector: 'issuance-custody', roles: ['custody', 'bank'], chains: ['multi-chain'], stage: 'active', capabilities: ['qualified custody'], evidence: [official('Custody overview', 'https://www.anchorage.com/', 'Anchorage Digital')], reviewedAt },
  { id: 'safe', name: 'Safe', url: 'https://docs.safe.global/', summary: '提供智能账户、多签和模块化账户基础设施。', pages: ['agents', 'finance'], sector: 'agent-wallets', roles: ['smart-account', 'treasury'], chains: ['EVM'], stage: 'active', capabilities: ['multisig', 'modules'], evidence: [official('Safe docs', 'https://docs.safe.global/', 'Safe')], reviewedAt },
  { id: 'privy', name: 'Privy', url: 'https://docs.privy.io/', summary: '提供应用嵌入式钱包、身份和服务器端签名控制工具。', pages: ['agents'], sector: 'agent-wallets', roles: ['embedded-wallet', 'identity'], chains: ['EVM', 'Solana'], stage: 'active', capabilities: ['embedded wallets', 'server wallets'], evidence: [official('Privy docs', 'https://docs.privy.io/', 'Privy')], reviewedAt },
  { id: 'crossmint', name: 'Crossmint', url: 'https://docs.crossmint.com/', summary: '提供钱包、支付与面向代理的链上结算开发者接口。', pages: ['agents'], sector: 'agent-wallets', roles: ['wallet', 'payments'], chains: ['EVM', 'Solana'], stage: 'active', capabilities: ['wallet APIs', 'payments'], evidence: [official('Crossmint docs', 'https://docs.crossmint.com/', 'Crossmint')], reviewedAt },
  { id: 'virtuals', name: 'Virtuals Protocol', url: 'https://docs.virtuals.io/', summary: '构建用于 AI 代理创建、代币化和协作的协议与平台。', pages: ['agents'], sector: 'agent-frameworks', roles: ['agent-platform'], chains: ['Base', 'Solana'], stage: 'active', capabilities: ['agent launch', 'agent commerce'], evidence: [official('Virtuals docs', 'https://docs.virtuals.io/', 'Virtuals Protocol')], reviewedAt },
  { id: 'autonolas', name: 'Olas', url: 'https://docs.olas.network/', summary: '提供可组合自治服务与代理经济的开发框架。', pages: ['agents'], sector: 'agent-frameworks', roles: ['agent-framework', 'agent-economy'], chains: ['Ethereum', 'Gnosis', 'Base'], stage: 'active', capabilities: ['autonomous services'], evidence: [official('Olas docs', 'https://docs.olas.network/', 'Olas')], reviewedAt },
  { id: 'fetch-ai', name: 'Fetch.ai', url: 'https://docs.fetch.ai/', summary: '提供 uAgents 框架和代理通信基础设施。', pages: ['agents'], sector: 'agent-frameworks', roles: ['agent-framework'], chains: ['Fetch.ai'], stage: 'active', capabilities: ['uAgents', 'agent communication'], evidence: [official('Fetch.ai docs', 'https://docs.fetch.ai/', 'Fetch.ai')], reviewedAt },
  { id: 'x402', name: 'x402', url: 'https://www.x402.org/', summary: '基于 HTTP 402 的开放支付协议，旨在让客户端和服务端进行机器可读的稳定币付费协商。', pages: ['agents'], sector: 'agent-wallets', roles: ['payment-protocol'], chains: ['Base', 'EVM'], stage: 'active', capabilities: ['HTTP 402 payments'], evidence: [official('x402 specification', 'https://www.x402.org/', 'x402')], reviewedAt },
  { id: 'bankr', name: 'Bankr', url: 'https://docs.bankr.bot/', summary: '提供面向自然语言与代理的链上交易和钱包交互产品。', pages: ['agents'], sector: 'agent-execution', roles: ['agent-trading', 'wallet'], chains: ['Base', 'EVM'], stage: 'active', capabilities: ['agent trading interface'], evidence: [official('Bankr docs', 'https://docs.bankr.bot/', 'Bankr')], reviewedAt },
  { id: 'mcpay', name: 'MCPay', url: 'https://mcpay.tech/', summary: '为 MCP 工具调用提供支付层；此处仅记录公开产品能力，未将其活动量视为真实代理采用。', pages: ['agents'], sector: 'agent-wallets', roles: ['payments', 'mcp'], chains: ['EVM'], stage: 'active', capabilities: ['MCP payments'], evidence: [official('MCPay', 'https://mcpay.tech/', 'MCPay')], reviewedAt },
  { id: 'mpp', name: 'Machine Payments Protocol', url: 'https://mpp.dev/', summary: '面向互联网服务与软件代理的开放支付协议。', pages: ['agents'], sector: 'agent-payment-protocols', roles: ['payment-protocol'], chains: ['multi-chain'], stage: 'active', capabilities: ['machine payments'], evidence: [official('MPP specification', 'https://mpp.dev/', 'MPP')], reviewedAt },
  { id: 'google-ap2', name: 'Agent Payments Protocol', url: 'https://developers.googleblog.com/en/introducing-agent-payments-protocol-ap2/', summary: 'Google 公布的代理支付授权协议，标准化授权与支付交互；它不是结算网络。', pages: ['agents'], sector: 'agent-payment-protocols', roles: ['payment-protocol', 'authorization'], chains: ['protocol-agnostic'], stage: 'announced', capabilities: ['agent payment authorization'], evidence: [official('AP2 announcement', 'https://developers.googleblog.com/en/introducing-agent-payments-protocol-ap2/', 'Google')], reviewedAt },
  { id: 'erc-8004', name: 'ERC-8004', url: 'https://ercs.ethereum.org/ERCS/erc-8004', summary: 'Ethereum 社区提案的无信任代理身份、信誉与验证标准。', pages: ['agents'], sector: 'agent-identity', roles: ['agent-identity', 'reputation'], chains: ['Ethereum', 'EVM'], stage: 'proposed', capabilities: ['identity registry', 'reputation registry'], evidence: [official('ERC-8004', 'https://ercs.ethereum.org/ERCS/erc-8004', 'Ethereum')], reviewedAt },
  { id: 'cow-protocol', name: 'CoW Protocol', url: 'https://docs.cow.fi/', summary: '通过批量拍卖与求解器网络执行交换意图。', pages: ['agents', 'finance'], sector: 'agent-intents', roles: ['intent-settlement', 'dex'], chains: ['Ethereum', 'Gnosis', 'Base', 'Arbitrum'], stage: 'active', capabilities: ['CoW Swap', 'solver network'], evidence: [official('CoW Protocol docs', 'https://docs.cow.fi/', 'CoW Protocol')], reviewedAt },
];

// A shared entity may play a different role on each peer page. UI should prefer this map to `sector` for cross-page cards.
export const entityPageSectors: Record<string, Partial<Record<Page, string>>> = {
  x402: { agents: 'agent-payment-protocols' },
  mcpay: { agents: 'agent-payment-protocols' },
  okx: { agents: 'agent-wallets', finance: 'issuance-custody' },
  coinbase: { agents: 'agent-wallets', finance: 'issuance-custody' },
  circle: { agents: 'agent-payment-protocols', finance: 'stablecoins' },
  uniswap: { agents: 'agent-execution', finance: 'dex-perps' },
  jupiter: { agents: 'agent-execution', finance: 'dex-perps' },
  '0x': { agents: 'agent-execution', finance: 'dex-perps' },
  hyperliquid: { agents: 'agent-execution', finance: 'dex-perps' },
  dydx: { agents: 'agent-execution', finance: 'dex-perps' },
  chainlink: { agents: 'agent-observability', finance: 'oracles-bridges' },
  safe: { agents: 'agent-wallets', finance: 'issuance-custody' },
  'cow-protocol': { agents: 'agent-intents', finance: 'dex-perps' },
};

export const research: LandscapeItem[] = [
  { id: 'rwa-allocation-vaults-2026-02-25', title: 'Allocation Vaults: Primer for Institutional Asset Managers', url: 'https://app.rwa.xyz/blog/allocation-vaults-primer-for-institutional-asset-managers', publisher: 'RWA.xyz', publishedAt: '2026-02-25', summary: '研究代币化资产如何经发行方、代币化平台、借贷协议、风险管理人与分销平台接入链上资金。以金库和信贷案例解释抵押品接纳、赎回期限与流动性错配；属于研究框架，不能替代具体产品尽调。', topic: 'rwa-finance', kind: 'report', evidenceLevel: 'primary' },
  { id: 'rwa-classification-2026-03-17', title: 'Introducing Our New Asset Classification Framework', url: 'https://app.rwa.xyz/blog/introducing-our-new-asset-classification-framework', publisher: 'RWA.xyz', publishedAt: '2026-03-17', summary: 'RWA.xyz 按底层经济敞口调整分类：统一 Credit，并将原有另类基金拆入信贷、PE/VC 与主动策略。基金是包装形式，不能代替对底层风险的识别。', topic: 'rwa-finance', kind: 'report', evidenceLevel: 'primary' },
  { id: 'defillama-api', title: 'DefiLlama API', url: 'https://defillama.com/docs/api', publisher: 'DefiLlama', publishedAt: '2026-10-18', summary: '方法文档；日期是本地核验日，不是文档发布日期。', topic: 'market-data', kind: 'report', evidenceLevel: 'methodology' },
  { id: 'chainclaw-preprint', title: 'ChainClaw: A Layered Agent Framework for Reliable On-Chain Execution', url: 'https://arxiv.org/abs/2608.05790', publisher: 'arXiv', publishedAt: '2026-08-06', summary: '预印本提出用于可靠链上执行的分层代理框架；其结果不是生产环境采用量。', topic: 'agents', kind: 'research', evidenceLevel: 'secondary' },
  { id: 'paperagents-preprint', title: 'Paper Agents, Paper Gains: An Empirical Analysis of DeFi Investment Agents', url: 'https://arxiv.org/abs/2605.29174', publisher: 'arXiv', publishedAt: '2026-05-27', summary: '预印本样本研究；结论受其样本与方法边界约束。', topic: 'agents', kind: 'research', evidenceLevel: 'secondary' },
];

export const events: LandscapeItem[] = [
  { id: 'okx-agentic-wallet-2026-03-18', title: 'OKX Agentic Wallet', url: 'https://www.okx.com/en-us/learn/agentic-wallet', publisher: 'OKX', publishedAt: '2026-03-18', summary: 'OKX 公布 Agentic Wallet；功能发布不等同于采用量。', topic: 'agents', kind: 'release', evidenceLevel: 'primary' },
  { id: 'binance-agent-os-2026-08-20', title: 'Binance Agent OS announcement', url: 'https://www.binance.com/en/blog/ecosystem/5991233187660196794', publisher: 'Binance', publishedAt: '2026-08-20', summary: 'Binance 公布 Agent OS；公告不单独证明活跃用户或代理成交量。', topic: 'agents', kind: 'release', evidenceLevel: 'primary' },
  { id: 'visa-stablecoin-settlement-2026-04-29', title: 'Visa expands stablecoin settlement pilot', url: 'https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22336.html', publisher: 'Visa', publishedAt: '2026-04-29', summary: 'Visa 公告称稳定币结算试点覆盖九条链，并披露约 70 亿美元年化运行率；该数值不是累计结算额或代理交易量。', topic: 'finance-payments', kind: 'release', evidenceLevel: 'primary' },
  { id: 'mastercard-stablecoin-settlement-2026-06-03', title: 'Mastercard expands stablecoin settlement capabilities', url: 'https://www.mastercard.com/au/en/news-and-trends/press/2026/june/mastercard-expands-settlement-capabilities-to-include-stablecoin.html', publisher: 'Mastercard', publishedAt: '2026-06-03', summary: 'Mastercard 公告计划扩展稳定币、日内与周末结算；部分市场处于早期 USDC 流程，不能表述为全球全面上线。', topic: 'finance-payments', kind: 'release', evidenceLevel: 'primary' },
  { id: 'blackrock-buidl-fund-page', title: 'BlackRock USD Institutional Digital Liquidity Fund', url: 'https://securitize.io/blackrock/buidl', publisher: 'Securitize', publishedAt: '2024-03-20', summary: 'Securitize 的 BUIDL 基金官方页面，作为当前产品与代币化基础设施的原始证据。', topic: 'rwa', kind: 'report', evidenceLevel: 'primary' },
];
