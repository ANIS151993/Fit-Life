import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="mb-8">
          <span className="text-6xl">&#x1F957;</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">FitLife</h1>
        <p className="text-xl text-gray-600 mb-2">
          Your Personal AI Nutritionist & Fitness Coach
        </p>
        <p className="text-gray-500 mb-10 max-w-2xl mx-auto">
          Snap a photo of your meal for instant nutrition analysis. Get a
          personalized diet plan and workout guide powered by AI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors shadow-lg"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-4xl mb-3">&#x1F4F8;</div>
            <h3 className="font-semibold text-gray-900 mb-2">Photo Analysis</h3>
            <p className="text-gray-500 text-sm">
              Snap your meal, get instant calories, proteins, vitamins & AI
              guidance
            </p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-4xl mb-3">&#x1F951;</div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Diet Plan</h3>
            <p className="text-gray-500 text-sm">
              Personalized 7-day meal plan by your AI nutritionist
            </p>
          </div>
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-4xl mb-3">&#x1F4AA;</div>
            <h3 className="font-semibold text-gray-900 mb-2">Workout Guide</h3>
            <p className="text-gray-500 text-sm">
              Step-by-step exercise programs tailored to your goals
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
