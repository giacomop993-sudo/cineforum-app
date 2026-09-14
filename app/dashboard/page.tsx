'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { X, Search, Film, Calendar, Star, Send, CheckCircle, Sparkles, History, PieChart, Trophy, Clock, Video, User, Ticket } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState<any[]>([]); 
  const [wishlistMovies, setWishlistMovies] = useState<any[]>([]); 
  const [historyMovies, setHistoryMovies] = useState<any[]>([]); 
  const [allVotes, setAllVotes] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Stati Sondaggio (Poll)
  const [pollStatus, setPollStatus] = useState<any>({ is_open: false, winning_movie_id: null });
  const [pollVotes, setPollVotes] = useState<any[]>([]);
  const [myVotes, setMyVotes] = useState<string[]>([]);

  // Stati Modale Film
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [movieDetails, setMovieDetails] = useState<any>(null);
  const [modalOrigin, setModalOrigin] = useState<'search' | 'wishlist' | 'history'>('search');

  // Stati Modale Regista
  const [selectedDirector, setSelectedDirector] = useState<any>(null);
  const [directorMovies, setDirectorMovies] = useState<any[]>([]);

  // Stati Voti Profilo (Aggiornati con originalita al posto di trama)
  const [originalita, setOriginalita] = useState<number>(7);
  const [regia, setRegia] = useState<number>(7);
  const [fotografia, setFotografia] = useState<number>(7);
  const [sceneggiatura, setSceneggiatura] = useState<number>(7);
  const [existingVoteId, setExistingVoteId] = useState<string | null>(null);

  // Stati Admin Eventi
  const [eventMovieId, setEventMovieId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLoading, setEventLoading] = useState(false);
  const [aiComment, setAiComment] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setUser(session.user);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile && profile.role === 'admin') setIsAdmin(true);
      fetchData(session.user.id); 
    };
    initUser();
  }, [router]);

  const fetchData = async (currentUserId = user?.id) => {
    const { data: moviesData } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
    if (moviesData) {
      setWishlistMovies(moviesData.filter(m => m.status === 'wishlist'));
      setHistoryMovies(moviesData.filter(m => m.status === 'history'));
    }
    const { data: votesData } = await supabase.from('votes').select('*');
    if (votesData) setAllVotes(votesData);

    const { data: eventData } = await supabase.from('events').select('*, movies(*)').order('created_at', { ascending: false }).limit(1).single();
    if (eventData) setNextEvent(eventData);

    const { data: pStatus } = await supabase.from('poll_status').select('*').limit(1).single();
    if (pStatus) setPollStatus(pStatus);
    
    const { data: pVotes } = await supabase.from('poll_votes').select('*');
    if (pVotes) {
      setPollVotes(pVotes);
      if (currentUserId) {
        setMyVotes(pVotes.filter(v => v.user_id === currentUserId).map(v => v.movie_id));
      }
    }
  };

  // ----- LOGICA SONDAGGIO -----
  const openPoll = async () => {
    if (!confirm("Questo azzererà i voti precedenti e aprirà una nuova votazione. Procedere?")) return;
    await supabase.from('poll_votes').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    if (pollStatus?.id) {
      await supabase.from('poll_status').update({ is_open: true, winning_movie_id: null }).eq('id', pollStatus.id);
    } else {
      await supabase.from('poll_status').insert([{ is_open: true, winning_movie_id: null }]);
    }
    fetchData();
  };

  const closePollAndDraw = async () => {
    if (pollVotes.length === 0) {
      alert("Nessun voto espresso! Chiudo la votazione senza vincitore.");
      if (pollStatus?.id) {
        await supabase.from('poll_status').update({ is_open: false, winning_movie_id: null }).eq('id', pollStatus.id);
      } else {
        await supabase.from('poll_status').insert([{ is_open: false, winning_movie_id: null }]);
      }
      fetchData();
      return;
    }

    const counts: Record<string, number> = {};
    pollVotes.forEach(v => counts[v.movie_id] = (counts[v.movie_id] || 0) + 1);
    
    const maxVotes = Math.max(...Object.values(counts));
    const topContenders = Object.keys(counts).filter(k => counts[k] === maxVotes);

    let winnerId = topContenders[0];
    if (topContenders.length > 1) {
      const randomIndex = Math.floor(Math.random() * topContenders.length);
      winnerId = topContenders[randomIndex];
      alert(`⚠️ C'è un pareggio con ${maxVotes} voti tra ${topContenders.length} film! Il sistema ha estratto a sorte il vincitore! 🎲`);
    } else {
      alert(`🎉 Votazione chiusa! Abbiamo un vincitore netto con ${maxVotes} voti!`);
    }

    if (pollStatus?.id) {
      await supabase.from('poll_status').update({ is_open: false, winning_movie_id: winnerId }).eq('id', pollStatus.id);
    } else {
      await supabase.from('poll_status').insert([{ is_open: false, winning_movie_id: winnerId }]);
    }
    fetchData();
  };

  const toggleVote = async (movieId: string) => {
    if (!pollStatus.is_open) return;
    if (myVotes.includes(movieId)) {
      await supabase.from('poll_votes').delete().eq('movie_id', movieId).eq('user_id', user.id);
    } else {
      if (myVotes.length >= 3) {
        alert("Hai già usato i tuoi 3 voti a disposizione!");
        return;
      }
      await supabase.from('poll_votes').insert({ movie_id: movieId, user_id: user.id });
    }
    fetchData();
  };
  // -----------------------------

  const fixRetroactiveDirectors = async () => {
    if (!confirm("Vuoi aggiornare in automatico i registi per i vecchi film?")) return;
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      const { data: moviesToFix } = await supabase.from('movies').select('*').eq('status', 'history').is('director', null);
      if (!moviesToFix || moviesToFix.length === 0) { alert("Tutti i film hanno già un regista!"); return; }
      let updatedCount = 0;
      for (const movie of moviesToFix) {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${apiKey}&language=it-IT&append_to_response=credits`);
        const tmdbData = await res.json();
        const director = tmdbData.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Sconosciuto';
        await supabase.from('movies').update({ director }).eq('id', movie.id);
        updatedCount++;
      }
      alert(`✅ Finito! Aggiornati ${updatedCount} film.`); fetchData(); 
    } catch (error) { alert("Errore durante l'aggiornamento."); }
  };

  const searchTMDB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=it-IT&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setMovies(data.results || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const openModal = async (movie: any, origin: 'search' | 'wishlist' | 'history') => {
    setSelectedMovie(movie); setModalOrigin(origin); setMovieDetails(null); 
    const tmdbId = origin === 'search' ? movie.id : movie.tmdb_id;
    const movieIdDb = origin === 'search' ? null : movie.id;

    if (movieIdDb && user) {
      const { data: voteData } = await supabase.from('votes').select('*').eq('movie_id', movieIdDb).eq('user_id', user.id).single();
      if (voteData) {
        setOriginalita(voteData.originalita); setRegia(voteData.regia); setFotografia(voteData.fotografia); setSceneggiatura(voteData.sceneggiatura); setExistingVoteId(voteData.id);
      } else {
        setOriginalita(7); setRegia(7); setFotografia(7); setSceneggiatura(7); setExistingVoteId(null);
      }
    }

    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=it-IT&append_to_response=credits`);
      let data = await res.json();
      if (!data.overview) {
        const resEn = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=en-US`);
        const dataEn = await resEn.json(); data.overview = dataEn.overview;
      }
      setMovieDetails(data);
    } catch (error) { console.error(error); }
  };

  const openDirectorModal = async (directorName: string) => {
    if (directorName === 'Sconosciuto') return;
    setDirectorMovies(historyMovies.filter(m => m.director === directorName));
    setSelectedDirector({ name: directorName, isFetching: true });

    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    try {
      const resSearch = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${apiKey}&language=it-IT&query=${encodeURIComponent(directorName)}`);
      const searchData = await resSearch.json();
      if (searchData.results && searchData.results.length > 0) {
        const personId = searchData.results[0].id;
        const resPerson = await fetch(`https://api.themoviedb.org/3/person/${personId}?api_key=${apiKey}&language=it-IT`);
        let personData = await resPerson.json();
        if (!personData.biography) {
          const resPersonEn = await fetch(`https://api.themoviedb.org/3/person/${personId}?api_key=${apiKey}&language=en-US`);
          const personDataEn = await resPersonEn.json(); personData.biography = personDataEn.biography;
        }
        setSelectedDirector({ ...personData, name: directorName, isFetching: false });
      } else {
        setSelectedDirector({ name: directorName, biography: 'Nessuna informazione trovata su TMDB.', isFetching: false });
      }
    } catch (err) { setSelectedDirector({ name: directorName, biography: 'Errore di rete.', isFetching: false }); }
  };

  const closeModal = () => { setSelectedMovie(null); setMovieDetails(null); };
  const closeDirectorModal = () => { setSelectedDirector(null); setDirectorMovies([]); };

  const addToWishlist = async () => {
    if (!selectedMovie) return;
    await supabase.from('movies').insert([{
      tmdb_id: selectedMovie.id, title: selectedMovie.title,
      poster_url: selectedMovie.poster_path ? `https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}` : null,
      release_year: selectedMovie.release_date ? selectedMovie.release_date.split('-')[0] : 'N/D',
      status: 'wishlist', added_by: user.id
    }]);
    setMovies([]); setSearchQuery(''); fetchData(); closeModal();
  };

  const markAsWatched = async () => {
    if (!selectedMovie || !movieDetails) return;
    const runtime = movieDetails.runtime || 0;
    const genres = movieDetails.genres ? movieDetails.genres.map((g: any) => g.name).join(', ') : 'Sconosciuto';
    const director = movieDetails.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Sconosciuto';
    await supabase.from('movies').update({ status: 'history', runtime, genres, director }).eq('id', selectedMovie.id);
    fetchData(); closeModal();
  };

  const deleteMovie = async () => {
    if (!selectedMovie) return;
    if(!confirm("Vuoi eliminare questo film?")) return;
    await supabase.from('movies').delete().eq('id', selectedMovie.id);
    fetchData(); closeModal();
  };

  const saveVotes = async () => {
    if (!selectedMovie) return;
    const votePayload = { movie_id: selectedMovie.id, user_id: user.id, originalita, regia, fotografia, sceneggiatura };
    if (existingVoteId) { await supabase.from('votes').update(votePayload).eq('id', existingVoteId); } 
    else { await supabase.from('votes').insert([votePayload]); }
    alert('⭐ Voti salvati!'); fetchData();
  };

  // CALCOLI ANALYTICS (Media basata su 4 parametri: originalita, regia, fotografia, sceneggiatura)
  const totalMovies = historyMovies.length;
  const totalHours = (historyMovies.reduce((acc, m) => acc + (m.runtime || 0), 0) / 60).toFixed(1);
  const historyMovieIds = historyMovies.map(m => m.id);
  const historyVotes = allVotes.filter(v => historyMovieIds.includes(v.movie_id));
  
  let avgVote = "0.0";
  if (historyVotes.length > 0) {
    const sum = historyVotes.reduce((acc, v) => acc + ((v.originalita + v.regia + v.fotografia + v.sceneggiatura) / 4), 0);
    avgVote = (sum / historyVotes.length).toFixed(1);
  }

  const genreCounts: Record<string, number> = {};
  historyMovies.forEach(m => { if(m.genres) m.genres.split(', ').forEach((g: string) => { genreCounts[g] = (genreCounts[g] || 0) + 1; }); });
  const sortedGenres = Object.entries(genreCounts).sort((a,b) => b[1] - a[1]);
  const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : "Nessuno";

  const directorCounts: Record<string, number> = {};
  historyMovies.forEach(m => { if(m.director && m.director !== 'Sconosciuto') directorCounts[m.director] = (directorCounts[m.director] || 0) + 1; });
  const topDirectors = Object.entries(directorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const moviesWithAvg = historyMovies.map(movie => {
    const movieVotes = allVotes.filter(v => v.movie_id === movie.id);
    let avg = 0;
    if (movieVotes.length > 0) {
      const sum = movieVotes.reduce((acc, v) => acc + ((v.originalita + v.regia + v.fotografia + v.sceneggiatura) / 4), 0);
      avg = sum / movieVotes.length;
    }
    return { ...movie, avgVote: avg };
  });

  const top10Movies = moviesWithAvg.filter(m => m.avgVote > 0).sort((a, b) => b.avgVote - a.avgVote).slice(0, 10);

  let pieGradient = "conic-gradient(#374151 0% 100%)";
  if (sortedGenres.length > 0) {
    let cumulative = 0;
    const totalCount = sortedGenres.reduce((acc, curr) => acc + curr[1], 0);
    const stops = sortedGenres.slice(0, 6).map((g, i) => {
      const percent = (g[1] / totalCount) * 100;
      const start = cumulative; cumulative += percent;
      return `${pieColors[i]} ${start}% ${cumulative}%`;
    });
    pieGradient = `conic-gradient(${stops.join(', ')})`;
  }

  const generateAIComment = async () => {
    setAiLoading(true);
    try {
      const movieTitles = historyMovies.slice(0, 10).map(m => m.title).join(', ');
      const res = await fetch('/api/generate-analytics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalMovies, topGenre, avgVote, totalHours, movieTitles })
      });
      const data = await res.json();
      if(data.success) setAiComment(data.comment);
      else alert("Errore AI: " + data.error);
    } catch(e) { alert("Impossibile contattare l'AI."); } finally { setAiLoading(false); }
  };

  const createEventAndNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventMovieId || !eventDate) return alert('Seleziona un film e una data.');
    setEventLoading(true);
    try {
      const movieToPlay = wishlistMovies.find(m => m.id === eventMovieId);
      if (!movieToPlay) throw new Error('Film non trovato');

      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      const resTmdb = await fetch(`https://api.themoviedb.org/3/movie/${movieToPlay.tmdb_id}?api_key=${apiKey}&language=it-IT&append_to_response=credits`);
      const tmdbData = await resTmdb.json();

      const director = tmdbData.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Sconosciuto';
      const genres = tmdbData.genres?.map((g: any) => g.name).join(', ') || 'N/D';
      
      await supabase.from('events').insert([{ movie_id: eventMovieId, scheduled_for: eventDate, created_by: user.id }]);
      const { data: profilesData } = await supabase.from('profiles').select('email');
      const userEmails = profilesData ? profilesData.map(p => p.email) : [user.email];

      const res = await fetch('/api/send-event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieTitle: movieToPlay.title, scheduledFor: eventDate, userEmails, posterUrl: movieToPlay.poster_url, overview: tmdbData.overview || '', director, genres, releaseYear: movieToPlay.release_year })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      alert(`🎉 Serata pianificata!`);
      setEventMovieId(''); setEventDate(''); fetchData();
    } catch (err: any) { alert('Errore: ' + err.message); } finally { setEventLoading(false); }
  };

  const popupPosterUrl = selectedMovie ? (modalOrigin === 'search' ? (selectedMovie.poster_path ? `https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}` : null) : selectedMovie.poster_url) : null;
  const userFinalAverage = ((Number(originalita) + Number(regia) + Number(fotografia) + Number(sceneggiatura)) / 4).toFixed(1);

  if (!user) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 relative">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s ease-out forwards; }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-gray-800 px-6 py-4 rounded-xl border border-gray-700 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎬</span>
            <h1 className="text-xl font-bold tracking-wide">Cineforum Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && <span className="bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded-full border border-yellow-500/30 font-bold">Admin</span>}
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="text-sm bg-gray-700 hover:bg-red-600 px-4 py-2 rounded-lg transition">Esci</button>
          </div>
        </div>

        {/* CONTENUTO PRINCIPALE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6 col-span-1 flex flex-col">
            
            {/* BOX APPUNTAMENTO */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-400 mb-3 font-semibold">
                  <Calendar size={20} /><span>Prossimo Appuntamento</span>
                </div>
                {nextEvent && nextEvent.movies ? (
                  <div className="bg-gray-900/60 p-4 rounded-lg border border-gray-700 mb-4 space-y-3">
                    {nextEvent.movies.poster_url && <img src={nextEvent.movies.poster_url} alt={nextEvent.movies.title} className="w-full h-40 object-cover rounded-md shadow" />}
                    <div>
                      <h3 className="font-bold text-white text-base">{nextEvent.movies.title} <span className="text-xs text-gray-400 font-normal">({nextEvent.movies.release_year})</span></h3>
                      <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                        <Clock size={14} /> {new Date(nextEvent.scheduled_for).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                ) : <p className="text-gray-400 text-sm mb-4">Nessuna serata pianificata al momento.</p>}

                {isAdmin && (
                  <div className="border-t border-gray-700 pt-4 mt-2">
                    <p className="text-xs font-semibold text-gray-300 mb-2">Pianifica / Modifica Serata:</p>
                    <form onSubmit={createEventAndNotify} className="space-y-3">
                      <select value={eventMovieId} onChange={(e) => setEventMovieId(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-lg text-sm outline-none text-white">
                        <option value="">-- Scegli dalla Wishlist --</option>
                        {wishlistMovies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                      </select>
                      <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-lg text-sm outline-none text-white" />
                      <button type="submit" disabled={eventLoading} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                        <Send size={16}/> {eventLoading ? 'Invio...' : 'Fissa e Invia Inviti (.ics)'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* TOP REGISTI */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <Video size={20} /><span>Top 5 Registi</span>
                </div>
                {isAdmin && (
                  <button onClick={fixRetroactiveDirectors} className="text-[10px] bg-cyan-900/30 text-cyan-400 hover:bg-cyan-800/50 px-2 py-1 rounded border border-cyan-800/50 transition">
                    Recupera vecchi registi
                  </button>
                )}
              </div>
              {topDirectors.length === 0 ? (
                <p className="text-gray-400 text-xs">Nessun regista nello storico.</p>
              ) : (
                <div className="space-y-3">
                  {topDirectors.map(([director, count], index) => (
                    <div key={director} onClick={() => openDirectorModal(director)} className="flex justify-between items-center bg-gray-900/60 p-3 rounded-lg border border-gray-700/50 text-sm cursor-pointer hover:border-cyan-500/50 transition group">
                      <span className="text-gray-200 truncate flex items-center gap-2 group-hover:text-cyan-300">
                        <span className="text-gray-500 font-bold w-4">{index + 1}.</span> {director}
                      </span>
                      <span className="text-cyan-400 font-bold bg-cyan-900/20 px-2 py-0.5 rounded text-xs">
                        {count} {count === 1 ? 'film' : 'film'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg lg:col-span-2 flex flex-col gap-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row gap-8 items-start z-10">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 text-purple-400 mb-4 font-semibold">
                  <PieChart size={20} /><span>Analytics Cineforum</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                    <div className="text-gray-400 text-xs">Film Visti</div>
                    <div className="text-2xl font-bold text-white">{totalMovies}</div>
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                    <div className="text-gray-400 text-xs">Ore Totali</div>
                    <div className="text-2xl font-bold text-white">{totalHours}h</div>
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                    <div className="text-gray-400 text-xs">Voto Medio Gruppo</div>
                    <div className="text-2xl font-bold text-green-400">{avgVote}</div>
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                    <div className="text-gray-400 text-xs">Genere Top</div>
                    <div className="text-lg font-bold text-purple-300 truncate">{topGenre}</div>
                  </div>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  {aiComment ? (
                    <p className="text-sm italic text-purple-200 leading-relaxed">"{aiComment}"</p>
                  ) : (
                    <button onClick={generateAIComment} disabled={aiLoading} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-4 rounded shadow-lg flex items-center gap-2 transition">
                      <Sparkles size={14} /> {aiLoading ? 'L\'AI sta analizzando...' : 'Genera Analisi AI'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="w-full md:w-auto flex items-center justify-center gap-6 pt-4 md:pt-8 pr-4">
                 <div style={{ background: pieGradient }} className="w-32 h-32 rounded-full shadow-2xl border-4 border-gray-800 shrink-0"></div>
                 <div className="flex flex-col gap-2 text-xs">
                   {sortedGenres.slice(0,5).map((g, i) => (
                     <div key={g[0]} className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }}></span>
                       <span className="text-gray-300 truncate max-w-[100px]">{g[0]} <span className="text-gray-500">({g[1]})</span></span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>

            {top10Movies.length > 0 && (
              <div className="z-10 mt-2 border-t border-gray-700 pt-6">
                <div className="flex items-center gap-2 text-yellow-400 mb-4 font-semibold">
                  <Trophy size={20} /><span>Top 10 Cineforum</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {top10Movies.map((m, i) => (
                    <div key={m.id} className="flex justify-between items-center bg-gray-900/60 p-3 rounded-lg border border-gray-700/50 shadow-sm transition hover:border-gray-500">
                      <span className="truncate text-gray-200 text-sm flex items-center gap-3">
                        <span className="text-gray-500 font-bold w-4">{i + 1}.</span> 
                        {m.title}
                      </span>
                      <span className="text-green-400 font-bold bg-green-900/20 px-2 py-1 rounded text-sm">{m.avgVote.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEZIONE SONDAGGIO SERATA */}
            <div className="z-10 mt-6 border-t border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-pink-400 font-semibold">
                  <Ticket size={20} /><span>Sondaggio Prossima Proiezione</span>
                </div>
                {isAdmin && (
                  <div>
                    {pollStatus?.is_open ? (
                      <button onClick={closePollAndDraw} className="text-xs bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded shadow transition font-bold">
                        Chiudi ed Estrai Vincitore
                      </button>
                    ) : (
                      <button onClick={openPoll} className="text-xs bg-pink-600 hover:bg-pink-700 text-white px-3 py-1.5 rounded shadow transition font-bold">
                        Apri Nuova Votazione
                      </button>
                    )}
                  </div>
                )}
              </div>

              {pollStatus?.is_open ? (
                <div className="bg-gray-900/50 p-4 rounded-lg border border-pink-500/30">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-300">Vota i film che vorresti vedere (Max 3 preferenze).</p>
                    <span className="bg-pink-900/40 text-pink-300 text-xs font-bold px-3 py-1 rounded-full border border-pink-500/50">
                      Voti a disposizione: {3 - myVotes.length}
                    </span>
                  </div>
                  
                  {wishlistMovies.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Nessun film in wishlist.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto pr-2">
                      {wishlistMovies.map(movie => {
                        const isVoted = myVotes.includes(movie.id);
                        const movieVoteCount = pollVotes.filter(v => v.movie_id === movie.id).length;
                        return (
                          <div key={movie.id} onClick={() => toggleVote(movie.id)} className={`relative rounded-lg overflow-hidden cursor-pointer transition shadow-md border-2 ${isVoted ? 'border-pink-500' : 'border-transparent hover:border-gray-500'}`}>
                            <img src={movie.poster_url} className="w-full aspect-[2/3] object-cover opacity-80 hover:opacity-100" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-2">
                              <p className="text-[10px] font-bold text-white truncate mb-1">{movie.title}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] bg-black/60 px-1.5 rounded text-gray-300">{movieVoteCount} Voti</span>
                                {isVoted ? (
                                  <span className="text-[10px] bg-pink-600 text-white px-2 py-0.5 rounded font-bold">Votato</span>
                                ) : (
                                  <span className="text-[10px] bg-gray-600 text-white px-2 py-0.5 rounded">Vota</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700 text-center">
                  {pollStatus?.winning_movie_id ? (
                    (() => {
                      const winner = wishlistMovies.find(m => m.id === pollStatus.winning_movie_id) || historyMovies.find(m => m.id === pollStatus.winning_movie_id);
                      if (winner) {
                        return (
                          <div className="flex flex-col items-center gap-3">
                            <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Il film estratto è:</span>
                            <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-lg border border-pink-500/50 shadow-lg text-left max-w-md w-full">
                              <img src={winner.poster_url} className="w-16 h-24 object-cover rounded shadow" />
                              <div>
                                <h4 className="text-lg font-bold text-white">{winner.title}</h4>
                                <p className="text-xs text-gray-400 mt-1">Il sistema ha chiuso le votazioni e decretato questo film come vincitore per la prossima proiezione.</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return <p className="text-sm text-gray-400">Vincitore non trovato nel database.</p>;
                    })()
                  ) : (
                    <p className="text-sm text-gray-400">Le votazioni sono attualmente chiuse.</p>
                  )}
                </div>
              )}
            </div>

            <Sparkles className="absolute -bottom-10 -right-10 text-purple-500/5" size={200} />
          </div>
        </div>
        
        {/* RICERCA */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center gap-2 mb-4 font-semibold text-lg">
            <Search size={20} className="text-green-400" />
            <h2>Cerca un film</h2>
          </div>
          <form onSubmit={searchTMDB} className="flex gap-4">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Digita il titolo..." className="flex-1 px-4 py-3 bg-gray-700 rounded-lg text-white outline-none" />
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-bold">Cerca</button>
          </form>
          {movies.length > 0 && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
              {movies.map((movie) => (
                <div key={movie.id} onClick={() => openModal(movie, 'search')} className="bg-gray-700/50 rounded-lg cursor-pointer hover:ring-2 ring-blue-500 transition overflow-hidden">
                  {movie.poster_path ? <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} className="w-full aspect-[2/3] object-cover" /> : <div className="w-full aspect-[2/3] bg-gray-700"></div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WISHLIST */}
        <div className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Film className="text-blue-400" /> La Nostra Wishlist</h2>
            <span className="bg-blue-600 text-xs font-bold px-3 py-1 rounded-full">{wishlistMovies.length} film</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {wishlistMovies.map((movie) => (
              <div key={movie.id} onClick={() => openModal(movie, 'wishlist')} className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-4 ring-blue-500 transition shadow-lg">
                <img src={movie.poster_url} className="w-full aspect-[2/3] object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* STORICO */}
        <div className="bg-gray-800/40 p-6 rounded-xl border border-dashed border-gray-600 shadow-inner">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-300"><History className="text-gray-400" /> Storico Visioni</h2>
            <span className="bg-gray-700 text-xs font-bold px-3 py-1 rounded-full">{historyMovies.length} film</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {historyMovies.map((movie) => (
              <div key={movie.id} onClick={() => openModal(movie, 'history')} className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-4 ring-gray-500 transition shadow-lg opacity-80 hover:opacity-100 grayscale hover:grayscale-0">
                <img src={movie.poster_url} className="w-full aspect-[2/3] object-cover" />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODALE FILM */}
      {selectedMovie && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-800 w-full max-w-4xl rounded-xl shadow-2xl border border-gray-600 flex flex-col max-h-[90vh] animate-scale-up">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
              <h2 className="text-xl font-bold truncate pr-4">{selectedMovie.title}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-1/2 flex flex-col gap-4">
                <img src={popupPosterUrl} className="w-full h-64 object-cover rounded-lg shadow-lg" />
                {!movieDetails ? <div className="text-center py-4 text-gray-400 animate-pulse">Caricamento...</div> : (
                  <div className="space-y-2 text-gray-300 text-sm">
                    <p><strong className="text-white">Regista:</strong> {movieDetails.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Sconosciuto'}</p>
                    <p><strong className="text-white">Durata:</strong> {movieDetails.runtime} min</p>
                    <p><strong className="text-white">Genere:</strong> {movieDetails.genres?.map((g: any) => g.name).join(', ')}</p>
                    <p className="text-xs leading-relaxed max-h-32 overflow-y-auto">{movieDetails.overview}</p>
                  </div>
                )}
              </div>
              {(modalOrigin === 'wishlist' || modalOrigin === 'history') && (
                <div className="w-full lg:w-1/2 bg-gray-900/60 p-5 rounded-xl border border-gray-700 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-blue-400 mb-4 flex items-center gap-2"><Star size={18} /> Il tuo giudizio (1 - 10)</h3>
                    <div className="space-y-4">
                      {['originalita', 'regia', 'fotografia', 'sceneggiatura'].map(crit => {
                        const val = crit === 'originalita' ? originalita : crit === 'regia' ? regia : crit === 'fotografia' ? fotografia : sceneggiatura;
                        const setVal = crit === 'originalita' ? setOriginalita : crit === 'regia' ? setRegia : crit === 'fotografia' ? setFotografia : setSceneggiatura;
                        return (
                          <div key={crit}>
                            <div className="flex justify-between text-xs font-semibold mb-1 capitalize"><span>{crit}</span><span className="text-blue-400">{val}</span></div>
                            <input type="range" min="1" max="10" step="0.5" value={val} onChange={(e) => setVal(Number(e.target.value))} className="w-full accent-blue-500" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center bg-gray-800/80 p-3 rounded-lg">
                    <span className="text-sm font-bold text-gray-300">Tuo Voto Medio:</span>
                    <span className="text-xl font-extrabold text-green-400">{userFinalAverage}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-900 border-t border-gray-700 flex flex-wrap justify-center gap-3 shrink-0">
              {modalOrigin === 'search' && (
                <>
                  <button onClick={addToWishlist} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-md">+ Aggiungi a Wishlist</button>
                  <button onClick={async () => {
                    if (!selectedMovie || !movieDetails) return;
                    const runtime = movieDetails.runtime || 0;
                    const genres = movieDetails.genres ? movieDetails.genres.map((g: any) => g.name).join(', ') : 'Sconosciuto';
                    const director = movieDetails.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Sconosciuto';
                    await supabase.from('movies').insert([{
                      tmdb_id: selectedMovie.id, title: selectedMovie.title,
                      poster_url: selectedMovie.poster_path ? `https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}` : null,
                      release_year: selectedMovie.release_date ? selectedMovie.release_date.split('-')[0] : 'N/D',
                      status: 'history', runtime, genres, director, added_by: user.id
                    }]);
                    setMovies([]); setSearchQuery(''); fetchData(); closeModal();
                  }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-md flex items-center gap-2"><CheckCircle size={18}/> Aggiungi ai Già Visti</button>
                </>
              )}
              {modalOrigin === 'wishlist' && (
                <>
                  <button onClick={saveVotes} className="bg-gray-700 hover:bg-gray-600 border border-gray-500 text-white font-bold py-2 px-4 rounded-lg transition shadow-md">Salva Voti</button>
                  <button onClick={markAsWatched} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-md flex items-center gap-2"><CheckCircle size={18}/> Segna come Visto</button>
                  <button onClick={deleteMovie} className="bg-red-600/80 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition shadow-md">Rimuovi</button>
                </>
              )}
              {modalOrigin === 'history' && (
                <>
                  <button onClick={saveVotes} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-md">Aggiorna Voti</button>
                  <button onClick={deleteMovie} className="bg-red-600/50 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition shadow-md text-sm">Rimuovi da Storico</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE REGISTA */}
      {selectedDirector && !selectedMovie && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-800 w-full max-w-4xl rounded-xl shadow-2xl border border-gray-600 flex flex-col max-h-[90vh] animate-scale-up">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 shrink-0">
              <h2 className="text-xl font-bold truncate pr-4 flex items-center gap-2">
                <Video size={20} className="text-cyan-400"/> {selectedDirector.name}
              </h2>
              <button onClick={closeDirectorModal} className="text-gray-400 hover:text-white transition"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-1/2 flex flex-col gap-4">
                {selectedDirector.profile_path ? (
                  <img src={`https://image.tmdb.org/t/p/w500${selectedDirector.profile_path}`} alt={selectedDirector.name} className="w-full h-72 object-cover rounded-lg shadow-lg" />
                ) : (
                  <div className="w-full h-72 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 shadow-lg"><User size={60} /></div>
                )}
                {selectedDirector.isFetching ? (
                  <div className="text-center py-4 text-gray-400 animate-pulse text-sm">Cerco informazioni...</div>
                ) : (
                  <div className="space-y-2 text-gray-300 text-sm">
                    <strong className="text-white block">Biografia:</strong>
                    <p className="text-xs leading-relaxed max-h-48 overflow-y-auto pr-2">{selectedDirector.biography || "Nessuna biografia disponibile su TMDB per questo regista."}</p>
                  </div>
                )}
              </div>
              <div className="w-full lg:w-1/2 bg-gray-900/60 p-5 rounded-xl border border-gray-700 flex flex-col">
                <h3 className="text-base font-bold text-cyan-400 mb-4 flex items-center gap-2"><Film size={18} /> Film Visti ({directorMovies.length})</h3>
                {directorMovies.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 max-h-[400px]">
                    {directorMovies.map(movie => (
                      <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-md flex flex-col">
                        {movie.poster_url ? (
                          <img src={movie.poster_url} className="w-full aspect-[2/3] object-cover" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center"><Film size={20} className="text-gray-500"/></div>
                        )}
                        <div className="p-2 bg-gray-900 text-center"><p className="text-xs font-bold text-gray-200 truncate">{movie.title}</p></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Nessun film salvato per questo regista.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}