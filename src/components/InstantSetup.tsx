import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  APIConfig, 
  saveAPIConfig, 
  getAPIConfigs, 
  removeAPIConfig, 
  clearAllAPIConfigs,
  validateAPIKey,
  getDefaultModel,
  getDefaultBaseUrl
} from '../../utils/apiConfig';

const InstantSetup: React.FC = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<{[key: string]: APIConfig}>({});
  const [activeProvider, setActiveProvider] = useState<APIConfig['provider']>('openai');
  const [formData, setFormData] = useState({
    apiKey: '',
    baseUrl: '',
    model: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const providers = [
    { id: 'openai' as const, name: 'OpenAI', icon: '🤖', description: 'GPT-4, GPT-3.5等模型' },
    { id: 'deepseek' as const, name: 'DeepSeek', icon: '🧠', description: '深度求索AI模型' },
    { id: 'anthropic' as const, name: 'Anthropic', icon: '🎭', description: 'Claude系列模型' },
    { id: 'gemini' as const, name: 'Google Gemini', icon: '💎', description: 'Google AI模型' }
  ];

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    const config = configs[activeProvider];
    if (config) {
      setFormData({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl || getDefaultBaseUrl(activeProvider),
        model: config.model || getDefaultModel(activeProvider)
      });
    } else {
      setFormData({
        apiKey: '',
        baseUrl: getDefaultBaseUrl(activeProvider),
        model: getDefaultModel(activeProvider)
      });
    }
  }, [activeProvider, configs]);

  const loadConfigs = () => {
    const loadedConfigs = getAPIConfigs();
    setConfigs(loadedConfigs);
  };

  const handleSave = async () => {
    if (!formData.apiKey.trim()) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return;
    }

    if (!validateAPIKey(activeProvider, formData.apiKey)) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return;
    }

    setSaveStatus('saving');

    try {
      const config: APIConfig = {
        provider: activeProvider,
        apiKey: formData.apiKey.trim(),
        baseUrl: formData.baseUrl.trim() || getDefaultBaseUrl(activeProvider),
        model: formData.model.trim() || getDefaultModel(activeProvider)
      };

      saveAPIConfig(config);
      loadConfigs();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleRemove = () => {
    removeAPIConfig(activeProvider);
    loadConfigs();
    setFormData({
      apiKey: '',
      baseUrl: getDefaultBaseUrl(activeProvider),
      model: getDefaultModel(activeProvider)
    });
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清除所有API配置吗？此操作不可撤销。')) {
      clearAllAPIConfigs();
      loadConfigs();
      setFormData({
        apiKey: '',
        baseUrl: getDefaultBaseUrl(activeProvider),
        model: getDefaultModel(activeProvider)
      });
    }
  };

  const getStatusColor = () => {
    switch (saveStatus) {
      case 'saving': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving': return '保存中...';
      case 'success': return '保存成功！';
      case 'error': return '保存失败，请检查API密钥格式';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 头部导航 */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← 返回首页
              </Link>
              <h1 className="text-2xl font-bold">⚡ 即时配置</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              {Object.keys(configs).length > 0 && (
                <Link
                  to="/chat"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  开始聊天
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 说明信息 */}
        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-blue-300">🚀 快速开始</h2>
          <div className="text-blue-200 space-y-2">
            <p>• 选择您要使用的AI服务提供商</p>
            <p>• 输入对应的API密钥即可开始使用</p>
            <p>• 所有配置都安全存储在本地，无需后端服务</p>
            <p>• 聊天记录也会自动保存在本地</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：提供商选择 */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">选择AI服务商</h3>
            <div className="space-y-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setActiveProvider(provider.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    activeProvider === provider.id
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div>
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-sm text-gray-400">{provider.description}</div>
                      </div>
                    </div>
                    {configs[provider.id] && (
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* 配置状态 */}
            <div className="mt-6 p-4 bg-gray-900 rounded-lg">
              <h4 className="font-medium mb-2">配置状态</h4>
              <div className="text-sm text-gray-400">
                已配置: {Object.keys(configs).length} / {providers.length}
              </div>
              {Object.keys(configs).length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="mt-3 text-red-400 hover:text-red-300 text-sm"
                >
                  清除所有配置
                </button>
              )}
            </div>
          </div>

          {/* 右侧：配置表单 */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-6">
                配置 {providers.find(p => p.id === activeProvider)?.name}
              </h3>

              <div className="space-y-6">
                {/* API密钥 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    API密钥 <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder={`输入${providers.find(p => p.id === activeProvider)?.name} API密钥`}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    {activeProvider === 'openai' && '格式: sk-...'}
                    {activeProvider === 'deepseek' && '格式: sk-...'}
                    {activeProvider === 'anthropic' && '格式: sk-ant-...'}
                    {activeProvider === 'gemini' && '从Google AI Studio获取'}
                  </div>
                </div>

                {/* Base URL */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    API地址 (可选)
                  </label>
                  <input
                    type="url"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder="使用默认地址或输入自定义地址"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* 模型 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    默认模型 (可选)
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="使用默认模型或输入自定义模型"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* 操作按钮 */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {saveStatus === 'saving' ? '保存中...' : '保存配置'}
                  </button>
                  {configs[activeProvider] && (
                    <button
                      onClick={handleRemove}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 安全提示 */}
            <div className="mt-6 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
              <h4 className="font-medium text-yellow-300 mb-2">🔒 安全提示</h4>
              <div className="text-yellow-200 text-sm space-y-1">
                <p>• API密钥使用简单加密存储在本地浏览器中</p>
                <p>• 请勿在公共设备上保存敏感配置</p>
                <p>• 定期更换API密钥以确保安全</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstantSetup;