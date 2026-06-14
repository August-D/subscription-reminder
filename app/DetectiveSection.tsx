"use client";

import { useState } from 'react';

export default function DetectiveSection({ subscriptions }: { subscriptions: any[] }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{ title: string; report: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnnihilateWallet = async () => {
    if (!subscriptions || subscriptions.length === 0) {
      alert("账单空空如也，连逆子都懒得理你，先加两条订阅吧！");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch('/api/detective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptions }) 
      });
      
      const result = await res.json();
      if (result.success) {
        setReport(result.data);
      } else {
        setError(result.error || "审判失败，逆子今天心情不好");
      }
    } catch (err) {
      setError("网络开小差了，神探拒绝睁眼");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-slate-900 border border-slate-800 rounded-xl max-w-2xl mx-auto shadow-lg text-white">
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
            🕵️‍♂️ 资本主义逆子 <span className="text-xs text-slate-400">一键审判你的赛博供奉，戳穿中产阶级幻觉</span>
          </h3>
        </div>

        <button
          onClick={handleAnnihilateWallet}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? '正在无情解剖中...' : '申请暴力审判'}
        </button>
      </div>

      {/* 审判结果展示框 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        {loading ? (
          <p className="text-sm text-gray-600">侦探正在顺着网线窥探你的账单...请稍候...</p>
        ) : report ? (
          <>
            <div className="inline-block px-3 py-1 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded mb-3">
              🏆 诊断称号：{report.title}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed italic">
              " {report.report} "
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400">暂无审判。请点击上方按钮，召唤资本主义逆子...</p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800/50 text-red-400 text-sm rounded-lg mt-4">
          ❌ {error}
        </div>
      )}
    </div>
  );
}