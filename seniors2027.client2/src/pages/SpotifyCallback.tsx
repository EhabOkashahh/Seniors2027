import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeSpotifyCodeRequest } from '../lib/authApi'

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      setError('Missing authorization code or state from Spotify.')
      return
    }

    async function processCallback() {
      const result = await exchangeSpotifyCodeRequest(code!, state!)
      if (result.ok && result.data) {
        const { status, userId, reason } = result.data
        const targetPath = userId ? `/profile/${userId}` : '/portal'
        const query = reason ? `?spotify=${status}&reason=${encodeURIComponent(reason)}` : `?spotify=${status}`
        navigate(`${targetPath}${query}`, { replace: true })
      } else {
        setError(result.error || 'Failed to exchange Spotify code.')
      }
    }

    processCallback()
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4">
        <div className="bg-[#1a1a1a] border border-red-900/50 p-8 rounded-2xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Spotify Connection Failed</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/portal')}
            className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors"
          >
            Back to Portal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-xl font-medium text-gray-300">Connecting your Spotify...</h1>
        <p className="text-sm text-gray-500 mt-2">Hang tight, we're almost there!</p>
      </div>
    </div>
  )
}
