import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import ConfigGuidePage from './components/ConfigGuidePage'
import InstantSetup from './components/InstantSetup'
import { ChatPage } from '../components/page/ChatPage'
import './App.css'

// 临时主页组件
function HomePage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          🤖 Nebulix Intelligence
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          基于React、TypeScript和Supabase构建的智能对话平台
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 backdrop-blur-sm p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-white">🧠 智能对话</h3>
            <p className="text-gray-300">支持多种AI模型的智能对话体验</p>
          </div>
          <div className="bg-gray-900 backdrop-blur-sm p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-white">📁 文件上传</h3>
            <p className="text-gray-300">支持图片、文档等多种文件格式</p>
          </div>
          <div className="bg-gray-900 backdrop-blur-sm p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-white">🔐 用户认证</h3>
            <p className="text-gray-300">安全的用户注册和登录系统</p>
          </div>
        </div>
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-6 backdrop-blur-sm">
          <p className="text-yellow-200">
            ⚠️ 请先配置Supabase后端服务才能正常使用应用功能
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Link 
            to="/instant-setup" 
            className="inline-block bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            ⚡ 即时配置
          </Link>
          <Link 
            to="/setup" 
            className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            🔧 一键配置
          </Link>
          <Link 
            to="/config-guide" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            📖 配置指南
          </Link>
          <a 
            href="https://github.com/Quantelix-AI/-Nebulix_Intelligence" 
            className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ⭐ GitHub
          </a>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/config-guide" element={<ConfigGuidePage />} />
        <Route path="/setup" element={<ConfigGuidePage />} />
        <Route path="/instant-setup" element={<InstantSetup />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </Router>
  )
}

export default App