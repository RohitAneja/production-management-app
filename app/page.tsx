export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8">
      <div className="bg-white p-10 rounded-xl shadow-lg text-center max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          Production Management System
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Welcome to the factory floor dashboard. Select your portal below.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Management Login
          </button>
          <button className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
            Operator Portal
          </button>
        </div>
      </div>
    </main>
  );
}