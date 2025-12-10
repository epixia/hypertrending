-- ============================================================================
-- HYPERTRENDING - Seed Markets/Niches Database
-- Full 4-Level Deep Niche Tree for Technology and Trading
-- ============================================================================

-- Clear existing markets data (optional - comment out if you want to keep existing)
-- TRUNCATE public.markets CASCADE;

-- ============================================================================
-- TECHNOLOGY VERTICAL
-- ============================================================================

-- Level 0: Technology (Root)
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0000-0000-0000-000000000001', NULL, 'Technology', 'technology', 0, 'Technology, software, hardware, and digital innovation', 'cpu', '#3B82F6', 1, '{"vertical": "technology"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ============================================================================
-- 1. AI & Machine Learning
-- ============================================================================

-- Level 1: AI & Machine Learning
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0001-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'AI & Machine Learning', 'ai-machine-learning', 1, 'Artificial intelligence and machine learning technologies', 'brain', '#8B5CF6', 1, '{"category": "ai"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: AI Tools
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0001-0001-0000-000000000001', '10000000-0001-0000-0000-000000000001', 'AI Tools', 'ai-tools', 2, 'General AI tools and applications', 'wand', '#8B5CF6', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: AI Tools subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0001-0001-0001-000000000001', '10000000-0001-0001-0000-000000000001', 'AI Writing Tools', 'ai-writing-tools', 3, 'AI-powered content and copywriting tools', 'pencil', '#8B5CF6', 1, '{}'::jsonb),
    ('10000000-0001-0001-0002-000000000001', '10000000-0001-0001-0000-000000000001', 'AI Image Generators', 'ai-image-generators', 3, 'AI tools for generating images and artwork', 'image', '#8B5CF6', 2, '{}'::jsonb),
    ('10000000-0001-0001-0003-000000000001', '10000000-0001-0001-0000-000000000001', 'AI Assistants', 'ai-assistants', 3, 'AI chatbots and virtual assistants', 'message-circle', '#8B5CF6', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Machine Learning
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0001-0002-0000-000000000001', '10000000-0001-0000-0000-000000000001', 'Machine Learning', 'machine-learning', 2, 'Machine learning frameworks and techniques', 'cpu', '#8B5CF6', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Machine Learning subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0001-0002-0001-000000000001', '10000000-0001-0002-0000-000000000001', 'Deep Learning', 'deep-learning', 3, 'Neural networks and deep learning models', 'layers', '#8B5CF6', 1, '{}'::jsonb),
    ('10000000-0001-0002-0002-000000000001', '10000000-0001-0002-0000-000000000001', 'Reinforcement Learning', 'reinforcement-learning', 3, 'Agent-based and reward-driven learning', 'repeat', '#8B5CF6', 2, '{}'::jsonb),
    ('10000000-0001-0002-0003-000000000001', '10000000-0001-0002-0000-000000000001', 'Data Labeling', 'data-labeling', 3, 'Data annotation and labeling services', 'tag', '#8B5CF6', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: AI Automation
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0001-0003-0000-000000000001', '10000000-0001-0000-0000-000000000001', 'AI Automation', 'ai-automation', 2, 'AI-powered automation and workflows', 'zap', '#8B5CF6', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: AI Automation subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0001-0003-0001-000000000001', '10000000-0001-0003-0000-000000000001', 'Workflow Automation', 'workflow-automation', 3, 'Automated business processes and workflows', 'git-branch', '#8B5CF6', 1, '{}'::jsonb),
    ('10000000-0001-0003-0002-000000000001', '10000000-0001-0003-0000-000000000001', 'Agentic Systems', 'agentic-systems', 3, 'Autonomous AI agents and multi-agent systems', 'users', '#8B5CF6', 2, '{}'::jsonb),
    ('10000000-0001-0003-0003-000000000001', '10000000-0001-0003-0000-000000000001', 'AI Coding Assistants', 'ai-coding-assistants', 3, 'AI tools for code generation and assistance', 'code', '#8B5CF6', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 2. Software Development
-- ============================================================================

-- Level 1: Software Development
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0002-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Software Development', 'software-development', 1, 'Software engineering and development tools', 'code', '#10B981', 2, '{"category": "software"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Web Development
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0002-0001-0000-000000000001', '10000000-0002-0000-0000-000000000001', 'Web Development', 'web-development', 2, 'Web application and website development', 'globe', '#10B981', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Web Development subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0002-0001-0001-000000000001', '10000000-0002-0001-0000-000000000001', 'Frontend Frameworks', 'frontend-frameworks', 3, 'React, Vue, Svelte and other frontend frameworks', 'layout', '#10B981', 1, '{"examples": ["React", "Vue", "Svelte"]}'::jsonb),
    ('10000000-0002-0001-0002-000000000001', '10000000-0002-0001-0000-000000000001', 'Backend Frameworks', 'backend-frameworks', 3, 'Laravel, Django, Node and other backend frameworks', 'server', '#10B981', 2, '{"examples": ["Laravel", "Django", "Node"]}'::jsonb),
    ('10000000-0002-0001-0003-000000000001', '10000000-0002-0001-0000-000000000001', 'API Development', 'api-development', 3, 'REST, GraphQL, and API design', 'link', '#10B981', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: App Development
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0002-0002-0000-000000000001', '10000000-0002-0000-0000-000000000001', 'App Development', 'app-development', 2, 'Mobile and desktop application development', 'smartphone', '#10B981', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: App Development subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0002-0002-0001-000000000001', '10000000-0002-0002-0000-000000000001', 'iOS Development', 'ios-development', 3, 'Apple iOS and macOS app development', 'apple', '#10B981', 1, '{}'::jsonb),
    ('10000000-0002-0002-0002-000000000001', '10000000-0002-0002-0000-000000000001', 'Android Development', 'android-development', 3, 'Android app development', 'smartphone', '#10B981', 2, '{}'::jsonb),
    ('10000000-0002-0002-0003-000000000001', '10000000-0002-0002-0000-000000000001', 'Cross-Platform', 'cross-platform', 3, 'Flutter, React Native and cross-platform tools', 'layers', '#10B981', 3, '{"examples": ["Flutter", "React Native"]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: DevOps
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0002-0003-0000-000000000001', '10000000-0002-0000-0000-000000000001', 'DevOps', 'devops', 2, 'Development operations and infrastructure', 'settings', '#10B981', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: DevOps subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0002-0003-0001-000000000001', '10000000-0002-0003-0000-000000000001', 'CI/CD', 'ci-cd', 3, 'Continuous integration and deployment', 'git-merge', '#10B981', 1, '{}'::jsonb),
    ('10000000-0002-0003-0002-000000000001', '10000000-0002-0003-0000-000000000001', 'Containers', 'containers', 3, 'Docker, Kubernetes and container orchestration', 'box', '#10B981', 2, '{"examples": ["Docker", "Kubernetes"]}'::jsonb),
    ('10000000-0002-0003-0003-000000000001', '10000000-0002-0003-0000-000000000001', 'Serverless', 'serverless', 3, 'Serverless computing and FaaS', 'cloud', '#10B981', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 3. Cybersecurity
-- ============================================================================

-- Level 1: Cybersecurity
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0003-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Cybersecurity', 'cybersecurity', 1, 'Security, privacy, and protection technologies', 'shield', '#EF4444', 3, '{"category": "security"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Personal Security
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0003-0001-0000-000000000001', '10000000-0003-0000-0000-000000000001', 'Personal Security', 'personal-security', 2, 'Individual security and privacy tools', 'user-check', '#EF4444', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Personal Security subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0003-0001-0001-000000000001', '10000000-0003-0001-0000-000000000001', 'Password Managers', 'password-managers', 3, 'Password storage and management tools', 'key', '#EF4444', 1, '{}'::jsonb),
    ('10000000-0003-0001-0002-000000000001', '10000000-0003-0001-0000-000000000001', 'Identity Protection', 'identity-protection', 3, 'Identity theft prevention and monitoring', 'user-shield', '#EF4444', 2, '{}'::jsonb),
    ('10000000-0003-0001-0003-000000000001', '10000000-0003-0001-0000-000000000001', 'Privacy Tools', 'privacy-tools', 3, 'Privacy enhancement and anonymization tools', 'eye-off', '#EF4444', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Network Security
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0003-0002-0000-000000000001', '10000000-0003-0000-0000-000000000001', 'Network Security', 'network-security', 2, 'Network protection and monitoring', 'wifi', '#EF4444', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Network Security subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0003-0002-0001-000000000001', '10000000-0003-0002-0000-000000000001', 'Firewalls', 'firewalls', 3, 'Network firewalls and access control', 'shield', '#EF4444', 1, '{}'::jsonb),
    ('10000000-0003-0002-0002-000000000001', '10000000-0003-0002-0000-000000000001', 'Zero Trust', 'zero-trust', 3, 'Zero trust security architecture', 'lock', '#EF4444', 2, '{}'::jsonb),
    ('10000000-0003-0002-0003-000000000001', '10000000-0003-0002-0000-000000000001', 'VPNs', 'vpns', 3, 'Virtual private networks', 'globe', '#EF4444', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Ethical Hacking
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0003-0003-0000-000000000001', '10000000-0003-0000-0000-000000000001', 'Ethical Hacking', 'ethical-hacking', 2, 'Penetration testing and security research', 'terminal', '#EF4444', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Ethical Hacking subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0003-0003-0001-000000000001', '10000000-0003-0003-0000-000000000001', 'Penetration Testing', 'penetration-testing', 3, 'Security penetration testing tools', 'target', '#EF4444', 1, '{}'::jsonb),
    ('10000000-0003-0003-0002-000000000001', '10000000-0003-0003-0000-000000000001', 'Bug Bounties', 'bug-bounties', 3, 'Bug bounty programs and platforms', 'award', '#EF4444', 2, '{}'::jsonb),
    ('10000000-0003-0003-0003-000000000001', '10000000-0003-0003-0000-000000000001', 'Malware Analysis', 'malware-analysis', 3, 'Malware detection and analysis', 'alert-triangle', '#EF4444', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 4. Hardware & Gadgets
-- ============================================================================

-- Level 1: Hardware & Gadgets
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0004-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Hardware & Gadgets', 'hardware-gadgets', 1, 'Physical computing devices and smart gadgets', 'hard-drive', '#F59E0B', 4, '{"category": "hardware"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Computing
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0004-0001-0000-000000000001', '10000000-0004-0000-0000-000000000001', 'Computing', 'computing', 2, 'Computing hardware and components', 'monitor', '#F59E0B', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Computing subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0004-0001-0001-000000000001', '10000000-0004-0001-0000-000000000001', 'Laptops', 'laptops', 3, 'Laptop computers and notebooks', 'laptop', '#F59E0B', 1, '{}'::jsonb),
    ('10000000-0004-0001-0002-000000000001', '10000000-0004-0001-0000-000000000001', 'GPUs / AI PCs', 'gpus-ai-pcs', 3, 'Graphics cards and AI-optimized computers', 'cpu', '#F59E0B', 2, '{}'::jsonb),
    ('10000000-0004-0001-0003-000000000001', '10000000-0004-0001-0000-000000000001', 'CPU Comparisons', 'cpu-comparisons', 3, 'Processor benchmarks and comparisons', 'bar-chart', '#F59E0B', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Smart Devices
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0004-0002-0000-000000000001', '10000000-0004-0000-0000-000000000001', 'Smart Devices', 'smart-devices', 2, 'Connected and smart devices', 'smartphone', '#F59E0B', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Smart Devices subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0004-0002-0001-000000000001', '10000000-0004-0002-0000-000000000001', 'Smart Home (IoT)', 'smart-home-iot', 3, 'Smart home and IoT devices', 'home', '#F59E0B', 1, '{}'::jsonb),
    ('10000000-0004-0002-0002-000000000001', '10000000-0004-0002-0000-000000000001', 'Wearables', 'wearables', 3, 'Smartwatches and wearable tech', 'watch', '#F59E0B', 2, '{}'::jsonb),
    ('10000000-0004-0002-0003-000000000001', '10000000-0004-0002-0000-000000000001', 'Personal Assistants', 'personal-assistants', 3, 'Voice assistants and smart speakers', 'mic', '#F59E0B', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Custom Builds
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0004-0003-0000-000000000001', '10000000-0004-0000-0000-000000000001', 'Custom Builds', 'custom-builds', 2, 'DIY and custom computer builds', 'tool', '#F59E0B', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Custom Builds subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0004-0003-0001-000000000001', '10000000-0004-0003-0000-000000000001', 'PC Building', 'pc-building', 3, 'Custom PC assembly and guides', 'package', '#F59E0B', 1, '{}'::jsonb),
    ('10000000-0004-0003-0002-000000000001', '10000000-0004-0003-0000-000000000001', 'Water Cooling', 'water-cooling', 3, 'Liquid cooling systems and setups', 'droplet', '#F59E0B', 2, '{}'::jsonb),
    ('10000000-0004-0003-0003-000000000001', '10000000-0004-0003-0000-000000000001', 'Performance Optimization', 'performance-optimization', 3, 'Overclocking and performance tuning', 'zap', '#F59E0B', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 5. Cloud & Infrastructure
-- ============================================================================

-- Level 1: Cloud & Infrastructure
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0005-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Cloud & Infrastructure', 'cloud-infrastructure', 1, 'Cloud computing and enterprise infrastructure', 'cloud', '#06B6D4', 5, '{"category": "cloud"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Cloud Platforms
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0005-0001-0000-000000000001', '10000000-0005-0000-0000-000000000001', 'Cloud Platforms', 'cloud-platforms', 2, 'Major cloud service providers', 'cloud', '#06B6D4', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Cloud Platforms subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0005-0001-0001-000000000001', '10000000-0005-0001-0000-000000000001', 'AWS', 'aws', 3, 'Amazon Web Services', 'cloud', '#06B6D4', 1, '{"provider": "amazon"}'::jsonb),
    ('10000000-0005-0001-0002-000000000001', '10000000-0005-0001-0000-000000000001', 'Google Cloud', 'google-cloud', 3, 'Google Cloud Platform', 'cloud', '#06B6D4', 2, '{"provider": "google"}'::jsonb),
    ('10000000-0005-0001-0003-000000000001', '10000000-0005-0001-0000-000000000001', 'Azure', 'azure', 3, 'Microsoft Azure', 'cloud', '#06B6D4', 3, '{"provider": "microsoft"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Storage & Compute
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0005-0002-0000-000000000001', '10000000-0005-0000-0000-000000000001', 'Storage & Compute', 'storage-compute', 2, 'Data storage and computing resources', 'database', '#06B6D4', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Storage & Compute subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0005-0002-0001-000000000001', '10000000-0005-0002-0000-000000000001', 'Object Storage', 'object-storage', 3, 'Cloud object storage services', 'archive', '#06B6D4', 1, '{}'::jsonb),
    ('10000000-0005-0002-0002-000000000001', '10000000-0005-0002-0000-000000000001', 'Databases', 'databases', 3, 'Cloud database services', 'database', '#06B6D4', 2, '{}'::jsonb),
    ('10000000-0005-0002-0003-000000000001', '10000000-0005-0002-0000-000000000001', 'Edge Computing', 'edge-computing', 3, 'Edge computing and CDN', 'globe', '#06B6D4', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Enterprise Systems
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0005-0003-0000-000000000001', '10000000-0005-0000-0000-000000000001', 'Enterprise Systems', 'enterprise-systems', 2, 'Enterprise software and systems', 'building', '#06B6D4', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Enterprise Systems subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0005-0003-0001-000000000001', '10000000-0005-0003-0000-000000000001', 'ERP', 'erp', 3, 'Enterprise resource planning systems', 'briefcase', '#06B6D4', 1, '{}'::jsonb),
    ('10000000-0005-0003-0002-000000000001', '10000000-0005-0003-0000-000000000001', 'CRM', 'crm', 3, 'Customer relationship management', 'users', '#06B6D4', 2, '{}'::jsonb),
    ('10000000-0005-0003-0003-000000000001', '10000000-0005-0003-0000-000000000001', 'Cloud Security', 'cloud-security', 3, 'Cloud security and compliance', 'shield', '#06B6D4', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 6. Blockchain & Web3
-- ============================================================================

-- Level 1: Blockchain & Web3
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0006-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Blockchain & Web3', 'blockchain-web3', 1, 'Blockchain technology and decentralized web', 'link', '#EC4899', 6, '{"category": "blockchain"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Crypto
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0006-0001-0000-000000000001', '10000000-0006-0000-0000-000000000001', 'Crypto', 'crypto', 2, 'Cryptocurrency and digital assets', 'dollar-sign', '#EC4899', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Crypto subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0006-0001-0001-000000000001', '10000000-0006-0001-0000-000000000001', 'Bitcoin', 'bitcoin', 3, 'Bitcoin network and ecosystem', 'circle', '#EC4899', 1, '{}'::jsonb),
    ('10000000-0006-0001-0002-000000000001', '10000000-0006-0001-0000-000000000001', 'Ethereum', 'ethereum', 3, 'Ethereum network and ecosystem', 'hexagon', '#EC4899', 2, '{}'::jsonb),
    ('10000000-0006-0001-0003-000000000001', '10000000-0006-0001-0000-000000000001', 'Altcoins', 'altcoins', 3, 'Alternative cryptocurrencies', 'coins', '#EC4899', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Web3 Development
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0006-0002-0000-000000000001', '10000000-0006-0000-0000-000000000001', 'Web3 Development', 'web3-development', 2, 'Decentralized application development', 'code', '#EC4899', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Web3 Development subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0006-0002-0001-000000000001', '10000000-0006-0002-0000-000000000001', 'Smart Contracts', 'smart-contracts', 3, 'Smart contract development', 'file-text', '#EC4899', 1, '{}'::jsonb),
    ('10000000-0006-0002-0002-000000000001', '10000000-0006-0002-0000-000000000001', 'Solidity', 'solidity', 3, 'Solidity programming language', 'code', '#EC4899', 2, '{}'::jsonb),
    ('10000000-0006-0002-0003-000000000001', '10000000-0006-0002-0000-000000000001', 'dApps', 'dapps', 3, 'Decentralized applications', 'grid', '#EC4899', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Digital Assets
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0006-0003-0000-000000000001', '10000000-0006-0000-0000-000000000001', 'Digital Assets', 'digital-assets', 2, 'NFTs and digital collectibles', 'image', '#EC4899', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Digital Assets subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('10000000-0006-0003-0001-000000000001', '10000000-0006-0003-0000-000000000001', 'NFTs', 'nfts', 3, 'Non-fungible tokens', 'image', '#EC4899', 1, '{}'::jsonb),
    ('10000000-0006-0003-0002-000000000001', '10000000-0006-0003-0000-000000000001', 'On-chain Analytics', 'on-chain-analytics', 3, 'Blockchain data analysis', 'activity', '#EC4899', 2, '{}'::jsonb),
    ('10000000-0006-0003-0003-000000000001', '10000000-0006-0003-0000-000000000001', 'Crypto Security', 'crypto-security', 3, 'Cryptocurrency security and custody', 'shield', '#EC4899', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- TRADING VERTICAL
-- ============================================================================

-- Level 0: Trading (Root)
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0000-0000-0000-000000000001', NULL, 'Trading', 'trading', 0, 'Financial markets, trading strategies, and investment', 'trending-up', '#22C55E', 2, '{"vertical": "trading"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ============================================================================
-- 1. Stock Trading
-- ============================================================================

-- Level 1: Stock Trading
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0001-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Stock Trading', 'stock-trading', 1, 'Equity markets and stock trading', 'bar-chart-2', '#22C55E', 1, '{"category": "stocks"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Fundamentals
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0001-0001-0000-000000000001', '20000000-0001-0000-0000-000000000001', 'Fundamentals', 'fundamentals', 2, 'Fundamental analysis and financial data', 'file-text', '#22C55E', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Fundamentals subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0001-0001-0001-000000000001', '20000000-0001-0001-0000-000000000001', 'Earnings', 'earnings', 3, 'Earnings reports and analysis', 'dollar-sign', '#22C55E', 1, '{}'::jsonb),
    ('20000000-0001-0001-0002-000000000001', '20000000-0001-0001-0000-000000000001', 'Balance Sheets', 'balance-sheets', 3, 'Financial statements analysis', 'clipboard', '#22C55E', 2, '{}'::jsonb),
    ('20000000-0001-0001-0003-000000000001', '20000000-0001-0001-0000-000000000001', 'SEC Filings', 'sec-filings', 3, 'SEC filings and regulatory documents', 'file', '#22C55E', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Technical Analysis
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0001-0002-0000-000000000001', '20000000-0001-0000-0000-000000000001', 'Technical Analysis', 'technical-analysis', 2, 'Chart patterns and technical indicators', 'activity', '#22C55E', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Technical Analysis subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0001-0002-0001-000000000001', '20000000-0001-0002-0000-000000000001', 'Chart Patterns', 'chart-patterns', 3, 'Technical chart patterns', 'trending-up', '#22C55E', 1, '{}'::jsonb),
    ('20000000-0001-0002-0002-000000000001', '20000000-0001-0002-0000-000000000001', 'Candlesticks', 'candlesticks', 3, 'Candlestick patterns and analysis', 'bar-chart', '#22C55E', 2, '{}'::jsonb),
    ('20000000-0001-0002-0003-000000000001', '20000000-0001-0002-0000-000000000001', 'Trend Indicators', 'trend-indicators', 3, 'Moving averages and trend tools', 'activity', '#22C55E', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Strategies
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0001-0003-0000-000000000001', '20000000-0001-0000-0000-000000000001', 'Strategies', 'stock-strategies', 2, 'Stock trading strategies', 'target', '#22C55E', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Strategies subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0001-0003-0001-000000000001', '20000000-0001-0003-0000-000000000001', 'Swing Trading', 'swing-trading', 3, 'Multi-day swing trading', 'repeat', '#22C55E', 1, '{}'::jsonb),
    ('20000000-0001-0003-0002-000000000001', '20000000-0001-0003-0000-000000000001', 'Day Trading', 'day-trading', 3, 'Intraday trading strategies', 'sun', '#22C55E', 2, '{}'::jsonb),
    ('20000000-0001-0003-0003-000000000001', '20000000-0001-0003-0000-000000000001', 'Scalping', 'scalping', 3, 'High-frequency scalping', 'zap', '#22C55E', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 2. Options Trading
-- ============================================================================

-- Level 1: Options Trading
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0002-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Options Trading', 'options-trading', 1, 'Options contracts and derivatives', 'layers', '#F97316', 2, '{"category": "options"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Basics
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0002-0001-0000-000000000001', '20000000-0002-0000-0000-000000000001', 'Basics', 'options-basics', 2, 'Options fundamentals and concepts', 'book', '#F97316', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Basics subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0002-0001-0001-000000000001', '20000000-0002-0001-0000-000000000001', 'Calls & Puts', 'calls-puts', 3, 'Call and put options basics', 'arrow-up-down', '#F97316', 1, '{}'::jsonb),
    ('20000000-0002-0001-0002-000000000001', '20000000-0002-0001-0000-000000000001', 'Greeks', 'greeks', 3, 'Delta, gamma, theta, vega', 'percent', '#F97316', 2, '{}'::jsonb),
    ('20000000-0002-0001-0003-000000000001', '20000000-0002-0001-0000-000000000001', 'Options Chains', 'options-chains', 3, 'Reading and analyzing options chains', 'list', '#F97316', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Options Strategies
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0002-0002-0000-000000000001', '20000000-0002-0000-0000-000000000001', 'Options Strategies', 'options-strategies', 2, 'Common options strategies', 'git-branch', '#F97316', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Options Strategies subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0002-0002-0001-000000000001', '20000000-0002-0002-0000-000000000001', 'Credit Spreads', 'credit-spreads', 3, 'Credit spread strategies', 'minus', '#F97316', 1, '{}'::jsonb),
    ('20000000-0002-0002-0002-000000000001', '20000000-0002-0002-0000-000000000001', 'Iron Condors', 'iron-condors', 3, 'Iron condor strategies', 'maximize-2', '#F97316', 2, '{}'::jsonb),
    ('20000000-0002-0002-0003-000000000001', '20000000-0002-0002-0000-000000000001', 'Covered Calls', 'covered-calls', 3, 'Covered call writing', 'shield', '#F97316', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Advanced Options
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0002-0003-0000-000000000001', '20000000-0002-0000-0000-000000000001', 'Advanced', 'advanced-options', 2, 'Advanced options trading', 'star', '#F97316', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Advanced Options subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0002-0003-0001-000000000001', '20000000-0002-0003-0000-000000000001', 'Volatility Trading', 'volatility-trading', 3, 'VIX and volatility strategies', 'activity', '#F97316', 1, '{}'::jsonb),
    ('20000000-0002-0003-0002-000000000001', '20000000-0002-0003-0000-000000000001', 'Earnings Plays', 'earnings-plays', 3, 'Options strategies around earnings', 'calendar', '#F97316', 2, '{}'::jsonb),
    ('20000000-0002-0003-0003-000000000001', '20000000-0002-0003-0000-000000000001', 'Zero-DTE', 'zero-dte', 3, 'Zero days to expiration trading', 'clock', '#F97316', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 3. Algorithmic Trading
-- ============================================================================

-- Level 1: Algorithmic Trading
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0003-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Algorithmic Trading', 'algorithmic-trading', 1, 'Automated and quantitative trading', 'cpu', '#8B5CF6', 3, '{"category": "algo"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Automation
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0003-0001-0000-000000000001', '20000000-0003-0000-0000-000000000001', 'Automation', 'trading-automation', 2, 'Trading automation and bots', 'settings', '#8B5CF6', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Automation subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0003-0001-0001-000000000001', '20000000-0003-0001-0000-000000000001', 'Trading Bots', 'trading-bots', 3, 'Automated trading bots', 'bot', '#8B5CF6', 1, '{}'::jsonb),
    ('20000000-0003-0001-0002-000000000001', '20000000-0003-0001-0000-000000000001', 'Algorithm Design', 'algorithm-design', 3, 'Trading algorithm development', 'code', '#8B5CF6', 2, '{}'::jsonb),
    ('20000000-0003-0001-0003-000000000001', '20000000-0003-0001-0000-000000000001', 'API Trading', 'api-trading', 3, 'Trading via broker APIs', 'link', '#8B5CF6', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Data Science
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0003-0002-0000-000000000001', '20000000-0003-0000-0000-000000000001', 'Data Science', 'trading-data-science', 2, 'Data science for trading', 'database', '#8B5CF6', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Data Science subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0003-0002-0001-000000000001', '20000000-0003-0002-0000-000000000001', 'Backtesting', 'backtesting', 3, 'Strategy backtesting and validation', 'rewind', '#8B5CF6', 1, '{}'::jsonb),
    ('20000000-0003-0002-0002-000000000001', '20000000-0003-0002-0000-000000000001', 'Feature Engineering', 'feature-engineering', 3, 'Feature extraction for ML models', 'layers', '#8B5CF6', 2, '{}'::jsonb),
    ('20000000-0003-0002-0003-000000000001', '20000000-0003-0002-0000-000000000001', 'ML-Driven Signals', 'ml-driven-signals', 3, 'Machine learning trading signals', 'zap', '#8B5CF6', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Platforms
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0003-0003-0000-000000000001', '20000000-0003-0000-0000-000000000001', 'Platforms', 'algo-platforms', 2, 'Algorithmic trading platforms', 'monitor', '#8B5CF6', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Platforms subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0003-0003-0001-000000000001', '20000000-0003-0003-0000-000000000001', 'TradingView', 'tradingview', 3, 'TradingView platform and Pine Script', 'bar-chart-2', '#8B5CF6', 1, '{}'::jsonb),
    ('20000000-0003-0003-0002-000000000001', '20000000-0003-0003-0000-000000000001', 'QuantConnect', 'quantconnect', 3, 'QuantConnect algorithmic trading', 'terminal', '#8B5CF6', 2, '{}'::jsonb),
    ('20000000-0003-0003-0003-000000000001', '20000000-0003-0003-0000-000000000001', 'IBKR API', 'ibkr-api', 3, 'Interactive Brokers API', 'code', '#8B5CF6', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 4. Crypto Trading
-- ============================================================================

-- Level 1: Crypto Trading
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0004-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Crypto Trading', 'crypto-trading', 1, 'Cryptocurrency trading and markets', 'bitcoin', '#F59E0B', 4, '{"category": "crypto"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Crypto Markets
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0004-0001-0000-000000000001', '20000000-0004-0000-0000-000000000001', 'Crypto Markets', 'crypto-markets', 2, 'Cryptocurrency market types', 'trending-up', '#F59E0B', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Crypto Markets subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0004-0001-0001-000000000001', '20000000-0004-0001-0000-000000000001', 'Spot', 'spot-trading', 3, 'Spot market trading', 'circle', '#F59E0B', 1, '{}'::jsonb),
    ('20000000-0004-0001-0002-000000000001', '20000000-0004-0001-0000-000000000001', 'Futures', 'crypto-futures', 3, 'Crypto futures trading', 'calendar', '#F59E0B', 2, '{}'::jsonb),
    ('20000000-0004-0001-0003-000000000001', '20000000-0004-0001-0000-000000000001', 'Perpetuals', 'perpetuals', 3, 'Perpetual swap contracts', 'infinity', '#F59E0B', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Crypto Indicators
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0004-0002-0000-000000000001', '20000000-0004-0000-0000-000000000001', 'Indicators', 'crypto-indicators', 2, 'Crypto-specific indicators', 'activity', '#F59E0B', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Crypto Indicators subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0004-0002-0001-000000000001', '20000000-0004-0002-0000-000000000001', 'Market Cycles', 'market-cycles', 3, 'Crypto market cycle analysis', 'refresh-cw', '#F59E0B', 1, '{}'::jsonb),
    ('20000000-0004-0002-0002-000000000001', '20000000-0004-0002-0000-000000000001', 'On-Chain Metrics', 'on-chain-metrics', 3, 'Blockchain data analysis', 'link', '#F59E0B', 2, '{}'::jsonb),
    ('20000000-0004-0002-0003-000000000001', '20000000-0004-0002-0000-000000000001', 'Funding Rates', 'funding-rates', 3, 'Perpetual funding rate analysis', 'percent', '#F59E0B', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Crypto Strategies
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0004-0003-0000-000000000001', '20000000-0004-0000-0000-000000000001', 'Crypto Strategies', 'crypto-strategies', 2, 'Cryptocurrency trading strategies', 'target', '#F59E0B', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Crypto Strategies subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0004-0003-0001-000000000001', '20000000-0004-0003-0000-000000000001', 'Momentum', 'crypto-momentum', 3, 'Momentum trading strategies', 'trending-up', '#F59E0B', 1, '{}'::jsonb),
    ('20000000-0004-0003-0002-000000000001', '20000000-0004-0003-0000-000000000001', 'Arbitrage', 'crypto-arbitrage', 3, 'Crypto arbitrage opportunities', 'shuffle', '#F59E0B', 2, '{}'::jsonb),
    ('20000000-0004-0003-0003-000000000001', '20000000-0004-0003-0000-000000000001', 'Liquidity Sniping', 'liquidity-sniping', 3, 'DEX liquidity sniping', 'crosshair', '#F59E0B', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 5. Forex
-- ============================================================================

-- Level 1: Forex
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0005-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Forex', 'forex', 1, 'Foreign exchange trading', 'dollar-sign', '#06B6D4', 5, '{"category": "forex"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Currency Pairs
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0005-0001-0000-000000000001', '20000000-0005-0000-0000-000000000001', 'Currency Pairs', 'currency-pairs', 2, 'Forex currency pair types', 'refresh-cw', '#06B6D4', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Currency Pairs subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0005-0001-0001-000000000001', '20000000-0005-0001-0000-000000000001', 'Majors', 'majors', 3, 'Major currency pairs (EUR/USD, GBP/USD)', 'star', '#06B6D4', 1, '{}'::jsonb),
    ('20000000-0005-0001-0002-000000000001', '20000000-0005-0001-0000-000000000001', 'Minors', 'minors', 3, 'Minor currency pairs', 'minus', '#06B6D4', 2, '{}'::jsonb),
    ('20000000-0005-0001-0003-000000000001', '20000000-0005-0001-0000-000000000001', 'Exotic Pairs', 'exotic-pairs', 3, 'Exotic currency pairs', 'globe', '#06B6D4', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Forex Strategies
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0005-0002-0000-000000000001', '20000000-0005-0000-0000-000000000001', 'Forex Strategies', 'forex-strategies', 2, 'Forex trading strategies', 'target', '#06B6D4', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Forex Strategies subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0005-0002-0001-000000000001', '20000000-0005-0002-0000-000000000001', 'Trend Following', 'trend-following', 3, 'Trend following strategies', 'trending-up', '#06B6D4', 1, '{}'::jsonb),
    ('20000000-0005-0002-0002-000000000001', '20000000-0005-0002-0000-000000000001', 'News Trading', 'news-trading', 3, 'Economic news-based trading', 'newspaper', '#06B6D4', 2, '{}'::jsonb),
    ('20000000-0005-0002-0003-000000000001', '20000000-0005-0002-0000-000000000001', 'Hedging', 'forex-hedging', 3, 'Currency hedging strategies', 'shield', '#06B6D4', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Forex Tools
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0005-0003-0000-000000000001', '20000000-0005-0000-0000-000000000001', 'Tools', 'forex-tools', 2, 'Forex trading tools and platforms', 'tool', '#06B6D4', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Forex Tools subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0005-0003-0001-000000000001', '20000000-0005-0003-0000-000000000001', 'MetaTrader', 'metatrader', 3, 'MetaTrader 4 and 5 platforms', 'monitor', '#06B6D4', 1, '{}'::jsonb),
    ('20000000-0005-0003-0002-000000000001', '20000000-0005-0003-0000-000000000001', 'Forex Indicators', 'forex-indicators', 3, 'Custom forex indicators', 'activity', '#06B6D4', 2, '{}'::jsonb),
    ('20000000-0005-0003-0003-000000000001', '20000000-0005-0003-0000-000000000001', 'Auto-Trading', 'forex-auto-trading', 3, 'Expert advisors and auto-trading', 'settings', '#06B6D4', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 6. Futures & Commodities
-- ============================================================================

-- Level 1: Futures & Commodities
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0006-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Futures & Commodities', 'futures-commodities', 1, 'Futures markets and commodity trading', 'package', '#EF4444', 6, '{"category": "futures"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Assets
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0006-0001-0000-000000000001', '20000000-0006-0000-0000-000000000001', 'Assets', 'commodity-assets', 2, 'Commodity asset classes', 'box', '#EF4444', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Assets subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0006-0001-0001-000000000001', '20000000-0006-0001-0000-000000000001', 'Metals', 'metals', 3, 'Gold, silver, and precious metals', 'circle', '#EF4444', 1, '{"examples": ["Gold", "Silver"]}'::jsonb),
    ('20000000-0006-0001-0002-000000000001', '20000000-0006-0001-0000-000000000001', 'Energy', 'energy', 3, 'Oil, natural gas, and energy', 'zap', '#EF4444', 2, '{"examples": ["Oil", "Natural Gas"]}'::jsonb),
    ('20000000-0006-0001-0003-000000000001', '20000000-0006-0001-0000-000000000001', 'Agriculture', 'agriculture', 3, 'Agricultural commodities', 'wheat', '#EF4444', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Futures Strategies
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0006-0002-0000-000000000001', '20000000-0006-0000-0000-000000000001', 'Futures Strategies', 'futures-strategies', 2, 'Futures trading strategies', 'target', '#EF4444', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Futures Strategies subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0006-0002-0001-000000000001', '20000000-0006-0002-0000-000000000001', 'Spread Trading', 'spread-trading', 3, 'Calendar and inter-commodity spreads', 'git-merge', '#EF4444', 1, '{}'::jsonb),
    ('20000000-0006-0002-0002-000000000001', '20000000-0006-0002-0000-000000000001', 'Futures Hedging', 'futures-hedging', 3, 'Hedging with futures contracts', 'shield', '#EF4444', 2, '{}'::jsonb),
    ('20000000-0006-0002-0003-000000000001', '20000000-0006-0002-0000-000000000001', 'Seasonal Patterns', 'seasonal-patterns', 3, 'Seasonal trading patterns', 'calendar', '#EF4444', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Advanced Futures
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0006-0003-0000-000000000001', '20000000-0006-0000-0000-000000000001', 'Advanced', 'advanced-futures', 2, 'Advanced futures analysis', 'star', '#EF4444', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Advanced Futures subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0006-0003-0001-000000000001', '20000000-0006-0003-0000-000000000001', 'Volume Profile', 'volume-profile', 3, 'Volume profile analysis', 'bar-chart', '#EF4444', 1, '{}'::jsonb),
    ('20000000-0006-0003-0002-000000000001', '20000000-0006-0003-0000-000000000001', 'Market Depth', 'market-depth', 3, 'Order book and market depth', 'layers', '#EF4444', 2, '{}'::jsonb),
    ('20000000-0006-0003-0003-000000000001', '20000000-0006-0003-0000-000000000001', 'Order Flow', 'order-flow', 3, 'Order flow analysis', 'activity', '#EF4444', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 7. Risk Management
-- ============================================================================

-- Level 1: Risk Management
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0007-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Risk Management', 'risk-management', 1, 'Trading risk management and psychology', 'shield', '#DC2626', 7, '{"category": "risk"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Tools
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0007-0001-0000-000000000001', '20000000-0007-0000-0000-000000000001', 'Tools', 'risk-tools', 2, 'Risk management tools', 'tool', '#DC2626', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Tools subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0007-0001-0001-000000000001', '20000000-0007-0001-0000-000000000001', 'Stop Loss', 'stop-loss', 3, 'Stop loss strategies and placement', 'x-circle', '#DC2626', 1, '{}'::jsonb),
    ('20000000-0007-0001-0002-000000000001', '20000000-0007-0001-0000-000000000001', 'Position Sizing', 'position-sizing', 3, 'Position sizing and risk per trade', 'percent', '#DC2626', 2, '{}'::jsonb),
    ('20000000-0007-0001-0003-000000000001', '20000000-0007-0001-0000-000000000001', 'ATR-based Rules', 'atr-based-rules', 3, 'ATR-based risk management', 'activity', '#DC2626', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Psychology
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0007-0002-0000-000000000001', '20000000-0007-0000-0000-000000000001', 'Psychology', 'trading-psychology', 2, 'Trading psychology and mindset', 'brain', '#DC2626', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Psychology subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0007-0002-0001-000000000001', '20000000-0007-0002-0000-000000000001', 'Discipline', 'discipline', 3, 'Trading discipline and rules', 'check-circle', '#DC2626', 1, '{}'::jsonb),
    ('20000000-0007-0002-0002-000000000001', '20000000-0007-0002-0000-000000000001', 'Emotional Control', 'emotional-control', 3, 'Managing emotions while trading', 'heart', '#DC2626', 2, '{}'::jsonb),
    ('20000000-0007-0002-0003-000000000001', '20000000-0007-0002-0000-000000000001', 'Bias Reduction', 'bias-reduction', 3, 'Cognitive bias awareness', 'eye', '#DC2626', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Portfolio
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0007-0003-0000-000000000001', '20000000-0007-0000-0000-000000000001', 'Portfolio', 'portfolio-management', 2, 'Portfolio risk management', 'pie-chart', '#DC2626', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Portfolio subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0007-0003-0001-000000000001', '20000000-0007-0003-0000-000000000001', 'Diversification', 'diversification', 3, 'Portfolio diversification strategies', 'grid', '#DC2626', 1, '{}'::jsonb),
    ('20000000-0007-0003-0002-000000000001', '20000000-0007-0003-0000-000000000001', 'Kelly Criterion', 'kelly-criterion', 3, 'Kelly criterion position sizing', 'calculator', '#DC2626', 2, '{}'::jsonb),
    ('20000000-0007-0003-0003-000000000001', '20000000-0007-0003-0000-000000000001', 'Drawdown Control', 'drawdown-control', 3, 'Managing and limiting drawdowns', 'trending-down', '#DC2626', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- 8. Trading Education
-- ============================================================================

-- Level 1: Trading Education
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0008-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Trading Education', 'trading-education', 1, 'Learning resources and education', 'book-open', '#6366F1', 8, '{"category": "education"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Beginner
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0008-0001-0000-000000000001', '20000000-0008-0000-0000-000000000001', 'Beginner', 'beginner', 2, 'Beginner trading education', 'play', '#6366F1', 1, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Beginner subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0008-0001-0001-000000000001', '20000000-0008-0001-0000-000000000001', 'Terminology', 'terminology', 3, 'Trading terms and definitions', 'book', '#6366F1', 1, '{}'::jsonb),
    ('20000000-0008-0001-0002-000000000001', '20000000-0008-0001-0000-000000000001', 'Market Basics', 'market-basics', 3, 'How markets work', 'info', '#6366F1', 2, '{}'::jsonb),
    ('20000000-0008-0001-0003-000000000001', '20000000-0008-0001-0000-000000000001', 'How Exchanges Work', 'how-exchanges-work', 3, 'Exchange mechanics and order types', 'building', '#6366F1', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Intermediate
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0008-0002-0000-000000000001', '20000000-0008-0000-0000-000000000001', 'Intermediate', 'intermediate', 2, 'Intermediate trading education', 'trending-up', '#6366F1', 2, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Intermediate subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0008-0002-0001-000000000001', '20000000-0008-0002-0000-000000000001', 'Strategy Building', 'strategy-building', 3, 'Developing trading strategies', 'tool', '#6366F1', 1, '{}'::jsonb),
    ('20000000-0008-0002-0002-000000000001', '20000000-0008-0002-0000-000000000001', 'Data Analysis', 'data-analysis', 3, 'Analyzing market data', 'bar-chart-2', '#6366F1', 2, '{}'::jsonb),
    ('20000000-0008-0002-0003-000000000001', '20000000-0008-0002-0000-000000000001', 'Broker Tools', 'broker-tools', 3, 'Using broker platforms effectively', 'monitor', '#6366F1', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 2: Advanced Education
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0008-0003-0000-000000000001', '20000000-0008-0000-0000-000000000001', 'Advanced', 'advanced-education', 2, 'Advanced trading concepts', 'award', '#6366F1', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Level 3: Advanced Education subcategories
INSERT INTO public.markets (id, parent_id, name, slug, level, description, icon, color, sort_order, metadata)
VALUES
    ('20000000-0008-0003-0001-000000000001', '20000000-0008-0003-0000-000000000001', 'Predictive Models', 'predictive-models', 3, 'Building predictive trading models', 'cpu', '#6366F1', 1, '{}'::jsonb),
    ('20000000-0008-0003-0002-000000000001', '20000000-0008-0003-0000-000000000001', 'HFT Concepts', 'hft-concepts', 3, 'High-frequency trading concepts', 'zap', '#6366F1', 2, '{}'::jsonb),
    ('20000000-0008-0003-0003-000000000001', '20000000-0008-0003-0000-000000000001', 'Liquidity Theory', 'liquidity-theory', 3, 'Market microstructure and liquidity', 'droplet', '#6366F1', 3, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- Update paths for all inserted markets (trigger handles this automatically)
-- ============================================================================

-- Verify the hierarchy
-- SELECT id, name, level, path FROM public.markets ORDER BY path;
