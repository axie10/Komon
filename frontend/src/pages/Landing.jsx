import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useTranslation } from "../context/SettingsContext";

export default function Landing() {
  const { connect, isConnected } = useWallet();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected) navigate("/dashboard");
  }, [isConnected, navigate]);

  const handleConnect = async () => {
    await connect();
    navigate("/dashboard");
  };

  const features = [
    { icon: "🏦", title: t("landing.feature1Title"), desc: t("landing.feature1Desc") },
    { icon: "🗳️", title: t("landing.feature2Title"), desc: t("landing.feature2Desc") },
    { icon: "📜", title: t("landing.feature3Title"), desc: t("landing.feature3Desc") },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
      <div className="max-w-xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-5 dark:text-white">
          {t("landing.title1")}
          <br />
          {t("landing.title2")}
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          {t("landing.subtitle")}
        </p>
        <button
          onClick={handleConnect}
          className="bg-komon-600 hover:bg-komon-700 text-white font-semibold px-6 py-3 rounded-xl transition text-base"
        >
          {t("landing.cta")}
        </button>
      </div>

      <div className="mt-20 grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold mb-1.5 dark:text-white">{f.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
