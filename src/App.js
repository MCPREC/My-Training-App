import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Dumbbell, 
  HeartPulse, 
  Calendar, 
  Flame, 
  Zap, 
  Video, 
  Utensils, 
  Scale, 
  Save, 
  Check, 
  Library, 
  Search, 
  Star, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Apple, 
  Camera, 
  Layers, 
  Activity, 
  X,
  Layout,
  Loader2
} from 'lucide-react';

/* FINAL STABLE HYBRID VERSION
  - Prevents "process is not defined" reference errors.
  - Fixes Firestore "odd segment" path errors.
  - Restores Cardio logging, Day Focus headers, and Macro Target editing.
*/

// --- FIREBASE CONFIGURATION ---
const getFirebaseConfig = () => {
  // 1. Check for Chat Preview Keys
  if (typeof __firebase_config !== 'undefined') {
    try {
      return JSON.parse(__firebase_config);
    } catch (e) {
      console.error("Error parsing preview config", e);
    }
  }
  
  // 2. Safe-check for Vercel/Production Environment Variables
  const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
  
  return {
    apiKey: env.REACT_APP_FIREBASE_API_KEY || "",
    authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
    projectId: env.REACT_APP_FIREBASE_PROJECT_ID || "",
    storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: env.REACT_APP_FIREBASE_SENDER_ID || "",
    appId: env.REACT_APP_FIREBASE_APP_ID || ""
  };
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sanitization: Ensure the ID doesn't contain slashes which break Firebase paths
const rawId = typeof __app_id !== 'undefined' ? __app_id : 'training-hub-v1-prod';
const appId = rawId.replace(/\//g, '_');

// --- DATA CONSTANTS ---
const EXERCISE_DATABASE = {
  CHEST: ["Barbell Bench Press", "Incline Barbell Press", "Flat DB Press", "Incline DB Press", "Decline DB Press", "Machine Chest Press", "Plate-Loaded Chest Press", "Smith Machine Incline Press", "Weighted Dips", "Assisted Dips", "Low-to-High Cable Fly", "High-to-Low Cable Fly", "Flat Cable Fly", "Pec Deck", "Single-Arm Cable Press", "Squeeze Press (DB)", "Guillotine Press (light only)", "Landmine Press", "Push-ups (weighted)", "Isometric Cable Chest Hold"],
  BACK: ["Neutral-Grip Pull-ups", "Pronated Pull-ups", "Assisted Pull-ups", "Lat Pulldown (neutral)", "Lat Pulldown (wide)", "Straight-Arm Pulldown", "Chest-Supported DB Row", "Chest-Supported T-Bar Row", "Seated Cable Row", "One-Arm Cable Row", "Machine Row (plate-loaded)", "Meadows Row", "Landmine Row", "Inverted Row", "Dumbbell Pullover", "Machine Pullover", "Seal Row", "High Row Machine", "Face Pull", "Rack Pull (controlled)"],
  SHOULDERS: ["Seated DB Shoulder Press", "Machine Shoulder Press", "Smith Machine Shoulder Press", "Arnold Press", "Landmine Press", "DB Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Cable Lateral", "Partial Lateral Raises", "Reverse Pec Deck", "Rear Delt Cable Fly", "Chest-Supported Rear Delt Raise", "Upright Row (cable, controlled)", "Plate Paragraph Raise", "Cable Front Raise", "Y-Raises (incline bench)", "Trap-3 Raise", "Isometric Lateral Hold", "Mechanical Drop-Set Laterals"],
  TRAPS: ["Barbell Shrugs", "DB Shrugs", "Machine Shrugs", "Smith Shrugs", "Behind-Back Shrugs", "Trap Bar Shrugs", "Farmer’s Carries", "Rack Pulls", "High Pull (light, controlled)", "Face Pull", "Cable Shrugs", "Overhead Shrugs", "Snatch-Grip Shrugs", "Incline Bench Shrugs", "Single-Arm DB Shrugs", "Band Pull-Apart", "Scapular Pull-ups", "Kettlebell Carries", "Plate Pinch Carry", "Isometric Shrug Holds"],
  BICEPS: ["EZ-Bar Curl", "Cable Curl", "Rope Hammer Curl", "Incline DB Curl", "Preacher Curl (machine)", "Spider Curl", "Bayesian Cable Curl", "Reverse Curl", "Concentration Curl", "Cross-Body Hammer Curl", "Machine Curl", "Chin-ups (neutral grip)", "Drag Curl", "21s (light)", "Single-Arm Cable Curl", "Fat Grip Curl", "Isometric Cable Curl Hold", "Zottman Curl", "High Cable Curl", "Tempo DB Curl"],
  TRICEPS: ["Close-Grip Bench", "Rope Pushdown", "Straight-Bar Pushdown", "Overhead Rope Extension", "Single-Arm Cable Extension", "Skull Crushers (EZ, moderate load)", "Machine Dip", "Bench Dips (controlled)", "Cross-Body Cable Extension", "Reverse-Grip Pushdown", "JM Press (moderate)", "DB Kickbacks", "Cable Kickbacks", "Tate Press", "Isometric Pushdown Hold", "Weighted Dips", "Floor Press (close grip)", "Band Pushdowns", "Overhead DB Extension", "PJR Pullover"],
  QUADS: ["Back Squat", "Front Squat", "Hack Squat", "Pendulum Squat", "Leg Press", "Bulgarian Split Squat", "Walking Lunges", "Reverse Lunges", "Smith Squat", "Sissy Squat", "Leg Extension", "Step-Ups", "Cyclist Squat", "Goblet Squat", "Heels-Elevated Squat", "Spanish Squat", "Wall Sit", "Tempo Squats", "Banded Leg Extensions", "Machine Belt Squat"],
  HAMSTRINGS: ["Romanian Deadlift", "Stiff-Leg Deadlift", "Seated Leg Curl", "Lying Leg Curl", "Nordic Curl", "Glute-Ham Raise", "Cable Pull-Through", "Good Morning", "Single-Leg RDL", "Hip Thrust", "Barbell Glute Bridge", "Reverse Hyper", "Kettlebell Swings", "Machine Hip Hinge", "Slider Leg Curl", "Stability Ball Curl", "Banded Leg Curl", "Tempo RDL", "45° Back Extension", "Single-Leg Curl (machine)"],
  CALVES: ["Standing Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Leg Press Calf Raise", "Smith Calf Raise", "Single-Leg Calf Raise", "Tibialis Raise", "Bent-Knee Calf Raise", "Pause Calf Raise", "Tempo Calf Raise", "Calf Raise Dropset", "Isometric Calf Hold", "Stair Calf Raise", "Farmer Carry on Toes", "Jump Rope (controlled)"],
  CORE: ["Cable Crunch", "Hanging Leg Raise", "Captain’s Chair Raise", "Ab Wheel", "Decline Sit-up", "Pallof Press", "Plank", "Side Plank", "Weighted Plank", "Dead Bug", "Bird Bug", "Russian Twist", "Landmine Rotation", "Medicine Ball Slam", "Stability Ball Crunch", "Reverse Crunch", "Toe Touches", "Dragon Flag (advanced)", "Suitcase Carry", "Farmer’s Carry"]
};

const DEFAULT_SCHEDULE = {
  Monday: { focus: "Chest (Upper Bias) + Triceps", cardio: "15–20m LISS", exercises: ["Incline DB Press", "Incline Smith Press", "Cable Fly (Low-to-High)", "Overhead Cable Extension", "DB Lateral Raises"] },
  Tuesday: { focus: "Back (Width Bias) + Biceps", cardio: "30–45m LISS", exercises: ["Lat Pulldowns (Wide)", "Single Arm Pulldowns", "Straight Arm Lat Pullovers", "Hammer Curls", "Incline DB Curls"] },
  Wednesday: { focus: "Legs + Traps", cardio: "None", exercises: ["Hack Squat", "Leg Extensions", "Seated Leg Curls", "DB Shrugs", "Hanging Leg Raises"] },
  Thursday: { focus: "Chest (Mid/Lower Bias) + Triceps", cardio: "15–20m LISS", exercises: ["Flat Barbell Press", "Dips", "Tricep Pushdowns", "Face Pulls", "Machine Lateral Raise"] },
  Friday: { focus: "Back (Thickness Bias) + Biceps", cardio: "None", exercises: ["Chest Supported Row", "Seated Cable Row", "One Arm DB Row", "Cable Curls", "Reverse Curls"] },
  Saturday: { focus: "Active Recovery", cardio: "45m Walk", exercises: ["Outdoor Walk", "Mobility Work"] },
  Sunday: { focus: "Rest Day", cardio: "Easy Walk", exercises: [] }
};

const createInitialLogs = () => {
  const logs = {
    globalGoals: {
      weight: { current: '', target: '' },
      measurements: {
        waist: { current: '', target: '' }, chest: { current: '', target: '' },
        arms: { current: '', target: '' }, thighs: { current: '', target: '' }
      },
      photos: { before: null, after: null }
    },
    nutrition: {
      macros: { protein: '220', carbs: '150', fats: '60' },
      meals: { 'Breakfast': [], 'Snack 1': [], 'Lunch': [], 'Snack 2': [], 'Dinner': [], 'Snack 3': [] },
      supplements: [
        { id: 1, name: 'Whey Isolate', timing: 'Post-workout' },
        { id: 2, name: 'Creatine Monohydrate', timing: '5g Daily' }
      ]
    },
    weeks: {}
  };

  for (let w = 1; w <= 12; w++) {
    logs.weeks[w] = {
      weight: '', mealPrepDone: false, videosMade: false,
      weeklyNotes: '', weeklyPhoto: null,
      checks: { 'No joint flare-ups': false, 'Strength stable': false },
      days: {}
    };

    Object.keys(DEFAULT_SCHEDULE).forEach(day => {
      logs.weeks[w].days[day] = {
        completed: false,
        cardio: { type: DEFAULT_SCHEDULE[day].cardio === 'None' ? '' : 'Walk', length: '', done: false },
        exercises: DEFAULT_SCHEDULE[day].exercises.map(name => ({
          id: Math.random().toString(36).substr(2, 9),
          name,
          sets: Array(4).fill(null).map(() => ({ weight: '', reps: '' })),
          difficulty: 5,
          notes: ''
        }))
      };
    });
  }
  return logs;
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('overview');
  const [activeWeek, setActiveWeek] = useState(1);
  const [expandedDays, setExpandedDays] = useState({ Monday: true });
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTargetDay, setPickerTargetDay] = useState(null);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  
  const [weeklyLogs, setWeeklyLogs] = useState(createInitialLogs());
  const goalBeforeRef = useRef(null);
  const goalAfterRef = useRef(null);

  // --- AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setIsLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'main');
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setWeeklyLogs(docSnap.data());
      }
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'main');
      await setDoc(userDocRef, weeklyLogs);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
    }
  };

  // --- LOGIC HELPERS ---
  const updateWeekMetric = (week, field, value) => {
    setWeeklyLogs(prev => ({
      ...prev,
      weeks: { ...prev.weeks, [week]: { ...prev.weeks[week], [field]: value } }
    }));
  };

  const updateGlobalGoal = (path, value) => {
    setWeeklyLogs(prev => {
      const next = { ...prev };
      let current = next.globalGoals;
      const keys = path.split('.');
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleGoalPhotoUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateGlobalGoal(`photos.${type}`, reader.result);
      reader.readAsDataURL(file);
    }
  };

  const addFoodItem = (mealName) => {
    setWeeklyLogs(prev => {
      const next = { ...prev };
      if (!next.nutrition.meals[mealName]) next.nutrition.meals[mealName] = [];
      next.nutrition.meals[mealName].push({ id: Date.now(), name: '', p: '', c: '', f: '' });
      return next;
    });
  };

  const updateFoodItem = (mealName, id, field, value) => {
    setWeeklyLogs(prev => {
      const next = { ...prev };
      next.nutrition.meals[mealName] = next.nutrition.meals[mealName].map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      return next;
    });
  };

  const removeFoodItem = (mealName, id) => {
    setWeeklyLogs(prev => {
      const next = { ...prev };
      next.nutrition.meals[mealName] = next.nutrition.meals[mealName].filter(item => item.id !== id);
      return next;
    });
  };

  const updateSupplement = (id, field, value) => {
    setWeeklyLogs(prev => ({
      ...prev,
      nutrition: {
        ...prev.nutrition,
        supplements: prev.nutrition.supplements.map(s => s.id === id ? { ...s, [field]: value } : s)
      }
    }));
  };

  const updateCardio = (week, day, field, value) => {
    setWeeklyLogs(prev => {
      const next = { ...prev };
      next.weeks[week].days[day].cardio[field] = value;
      return next;
    });
  };

  const updateExercise = (week, day, exerciseId, field, value) => {
    setWeeklyLogs(prev => {
      const next = { ...prev };
      const dayData = next.weeks[week].days[day];
      dayData.exercises = dayData.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, [field]: value } : ex
      );
      return next;
    });
  };

  const updateSet = (week, day, exerciseId, setIdx, field, value) => {
    setWeeklyLogs(prev => {
      const next = { ...prev };
      const dayData = next.weeks[week].days[day];
      dayData.exercises = dayData.exercises.map(ex => {
        if (ex.id === exerciseId) {
          const newSets = [...ex.sets];
          newSets[setIdx] = { ...newSets[setIdx], [field]: value };
          return { ...ex, sets: newSets };
        }
        return ex;
      });
      return next;
    });
  };

  const addExercise = (week, day, name = "New Exercise") => {
    setWeeklyLogs(prev => {
      const next = { ...prev };
      next.weeks[week].days[day].exercises.push({
        id: Math.random().toString(36).substr(2, 9),
        name,
        sets: Array(4).fill(null).map(() => ({ weight: '', reps: '' })),
        difficulty: 5,
        notes: ''
      });
      return next;
    });
    setIsPickerOpen(false);
  };

  const removeExercise = (week, day, id) => {
    setWeeklyLogs(prev => {
      const next = { ...prev };
      next.weeks[week].days[day].exercises = next.weeks[week].days[day].exercises.filter(ex => ex.id !== id);
      return next;
    });
  };

  const isTendonSafe = (name) => {
    const keywords = ['Cable', 'Neutral', 'Machine', 'Hammer', 'Rope', 'Assisted', 'Chest-Supported', 'V-Bar'];
    return keywords.some(key => String(name || '').toLowerCase().includes(key.toLowerCase()));
  };

  const calculateMealTotal = (mealName) => {
    if (!weeklyLogs.nutrition.meals[mealName]) return { p: 0, c: 0, f: 0 };
    return weeklyLogs.nutrition.meals[mealName].reduce((acc, item) => ({
      p: acc.p + (Number(item.p) || 0),
      c: acc.c + (Number(item.c) || 0),
      f: acc.f + (Number(item.f) || 0)
    }), { p: 0, c: 0, f: 0 });
  };

  const calculateDailyTotal = () => {
    return Object.keys(weeklyLogs.nutrition.meals).reduce((acc, mealName) => {
      const meal = calculateMealTotal(mealName);
      return { p: acc.p + meal.p, c: acc.c + meal.c, f: acc.f + meal.f };
    }, { p: 0, c: 0, f: 0 });
  };

  // --- RENDERING ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-xl font-black italic tracking-tighter uppercase">Booting Training Hub Pro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative">
      {/* VAULT PICKER */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col items-center p-6 md:p-12 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl flex flex-col h-full">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Vault Picker</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Adding to {String(pickerTargetDay)}</p>
              </div>
              <button onClick={() => setIsPickerOpen(false)} className="p-3 bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-lg"><X className="w-6 h-6" /></button>
            </div>
            <div className="relative mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input autoFocus type="text" placeholder="Search variations..." value={vaultSearchQuery} onChange={(e) => setVaultSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-white focus:outline-none focus:border-orange-500 font-bold shadow-2xl transition-all" />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-8 pb-12">
              {Object.entries(EXERCISE_DATABASE).map(([category, list]) => {
                const filtered = list.filter(ex => String(ex).toLowerCase().includes(vaultSearchQuery.toLowerCase()));
                if (filtered.length === 0) return null;
                return (
                  <div key={category}>
                    <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-3 sticky top-0 bg-transparent py-1">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filtered.map(ex => (
                        <button key={ex} onClick={() => addExercise(activeWeek, pickerTargetDay, ex)} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-orange-500 transition-all text-left group shadow-lg">
                          <span className="text-sm font-bold text-slate-300 group-hover:text-white">{String(ex)}</span>
                          <div className="flex items-center gap-2">
                             {isTendonSafe(ex) && <Star className="w-3 h-3 text-green-500 fill-green-500 group-hover:text-white" />}
                             <Plus className="w-4 h-4 text-slate-700 group-hover:text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-900 shadow-2xl">
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
          <nav className="flex flex-wrap justify-center gap-2">
            <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-1 shadow-lg">
              <button onClick={() => setView('overview')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${view === 'overview' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}><Layout className="w-4 h-4" /> Overview</button>
              <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${view === 'dashboard' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}><Calendar className="w-4 h-4" /> Plan</button>
              <button onClick={() => setView('goals')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${view === 'goals' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}><Target className="w-4 h-4" /> Goals</button>
              <button onClick={() => setView('nutrition')} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${view === 'nutrition' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}><Apple className="w-4 h-4" /> Nutrition</button>
            </div>
          </nav>
          {view === 'dashboard' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-xl font-black italic text-white uppercase tracking-tighter"><Flame className="w-5 h-5 text-orange-500 inline mr-2" /> WEEK {String(activeWeek)} TRAINING LOG</h1>
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {[...Array(12)].map((_, i) => (
                  <button key={i + 1} onClick={() => setActiveWeek(i + 1)} className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border ${activeWeek === i + 1 ? 'bg-orange-500 border-orange-400 text-white shadow-md shadow-orange-500/30' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>{i + 1}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {view === 'overview' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
            <header className="mb-10"><h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">Phase 1 Overview</h1></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(DEFAULT_SCHEDULE).map((day) => (
                <div key={day} className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-black italic text-white tracking-tight">{String(day).toUpperCase()}</h3>
                    {DEFAULT_SCHEDULE[day].cardio !== 'None' && (
                      <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase"><HeartPulse className="w-3 h-3" /> {String(DEFAULT_SCHEDULE[day].cardio)}</div>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-4"><Zap className="w-4 h-4 text-orange-500 inline mr-2" /> {String(DEFAULT_SCHEDULE[day].focus)}</p>
                  <div className="flex flex-wrap gap-2">{DEFAULT_SCHEDULE[day].exercises.map((ex, i) => (<span key={i} className="text-[10px] bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-500">{String(ex)}</span>))}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-4 space-y-6">
              <section className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl sticky top-48">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Weekly Progress</h3>
                  <button onClick={handleSave} className={`p-2 rounded-lg transition-all ${saveStatus === 'success' ? 'bg-green-500' : saveStatus === 'saving' ? 'bg-orange-500 animate-pulse' : 'bg-slate-800'}`}>
                    {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 mb-2 block uppercase">Current Weight (lbs)</label>
                    <input type="number" value={weeklyLogs.weeks[activeWeek].weight} onChange={(e) => updateWeekMetric(activeWeek, 'weight', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-3xl font-black text-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="0.0" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => updateWeekMetric(activeWeek, 'mealPrepDone', !weeklyLogs.weeks[activeWeek].mealPrepDone)} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${weeklyLogs.weeks[activeWeek].mealPrepDone ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-950 border-slate-800 text-slate-700'}`}><Utensils className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Meal Prep</span></button>
                    <button onClick={() => updateWeekMetric(activeWeek, 'videosMade', !weeklyLogs.weeks[activeWeek].videosMade)} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${weeklyLogs.weeks[activeWeek].videosMade ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-700'}`}><Video className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Content</span></button>
                  </div>
                  <div className="pt-6 border-t border-slate-800">
                    <label className="text-[9px] font-black text-slate-600 mb-2 block uppercase tracking-widest">Reflections</label>
                    <textarea value={weeklyLogs.weeks[activeWeek].weeklyNotes} onChange={(e) => updateWeekMetric(activeWeek, 'weeklyNotes', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 h-24 outline-none resize-none focus:border-orange-500 transition-all" placeholder="..." />
                  </div>
                </div>
              </section>
            </aside>

            <main className="lg:col-span-8 space-y-4">
              {Object.keys(DEFAULT_SCHEDULE).map((day) => (
                <div key={day} className={`bg-slate-900 rounded-[2rem] border overflow-hidden ${expandedDays[day] ? 'border-orange-500/50 shadow-2xl' : 'border-slate-800 hover:border-slate-700'}`}>
                  <button onClick={() => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))} className="w-full p-6 md:p-8 flex justify-between items-center group">
                    <div className="flex items-center gap-4 text-left">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${weeklyLogs.weeks[activeWeek].days[day].completed ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`}><Dumbbell className="w-5 h-5" /></div>
                      <div>
                        <h2 className={`text-xl font-black italic uppercase tracking-tight transition-colors ${expandedDays[day] ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{String(day)}</h2>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{String(DEFAULT_SCHEDULE[day].focus)}</span>
                      </div>
                    </div>
                    <ChevronDown className={`transition-transform ${expandedDays[day] ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedDays[day] && (
                    <div className="px-6 pb-8 md:px-8 animate-in fade-in duration-300">
                      {/* CARDIO LOG RESTORED */}
                      <div className="mb-8 pt-4 border-t border-slate-800">
                        <span className="text-xs font-black uppercase flex items-center gap-2 text-slate-400 mb-4 tracking-widest"><HeartPulse className="w-4 h-4 text-orange-500" /> Daily Cardio Log</span>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-950/30 p-4 rounded-2xl border border-slate-800 shadow-inner">
                          <input type="text" value={weeklyLogs.weeks[activeWeek].days[day].cardio.type} onChange={(e) => updateCardio(activeWeek, day, 'type', e.target.value)} placeholder="Activity" className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-orange-500 transition-all" />
                          <input type="number" value={weeklyLogs.weeks[activeWeek].days[day].cardio.length} onChange={(e) => updateCardio(activeWeek, day, 'length', e.target.value)} placeholder="Mins" className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white outline-none focus:border-orange-500 transition-all" />
                          <button onClick={() => updateCardio(activeWeek, day, 'done', !weeklyLogs.weeks[activeWeek].days[day].cardio.done)} className={`py-2 rounded-lg text-xs font-black transition-all ${weeklyLogs.weeks[activeWeek].days[day].cardio.done ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>DONE</button>
                        </div>
                      </div>
                      {/* EXERCISES */}
                      <div className="space-y-6">
                        {weeklyLogs.weeks[activeWeek].days[day].exercises.map((ex) => (
                          <div key={ex.id} className="bg-slate-950/50 border border-slate-800/50 rounded-3xl p-6 transition-all shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex-1"><input value={String(ex.name)} onChange={(e) => updateExercise(activeWeek, day, ex.id, 'name', e.target.value)} className="bg-transparent text-lg font-black text-white outline-none w-full border-b border-transparent focus:border-orange-500 transition-all" />{isTendonSafe(ex.name) && <span className="text-[8px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-black uppercase mt-1 inline-block tracking-tighter">Tendon Safe</span>}</div>
                              <button onClick={() => removeExercise(activeWeek, day, ex.id)} className="p-2 text-slate-800 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {ex.sets.map((set, setIdx) => (
                                <div key={setIdx} className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shadow-inner">
                                  <span className="text-[8px] font-black text-slate-700 block mb-1 uppercase tracking-tighter">SET {setIdx + 1}</span>
                                  <div className="flex gap-1">
                                    <input value={String((set && set.weight) || '')} onChange={(e) => updateSet(activeWeek, day, ex.id, setIdx, 'weight', e.target.value)} placeholder="WT" className="w-full bg-slate-950 border border-slate-800 rounded text-center text-[10px] font-bold text-white outline-none focus:border-orange-500 transition-all shadow-sm" />
                                    <input value={String((set && set.reps) || '')} onChange={(e) => updateSet(activeWeek, day, ex.id, setIdx, 'reps', e.target.value)} placeholder="RP" className="w-full bg-slate-950 border border-slate-800 rounded text-center text-[10px] text-slate-600 outline-none focus:border-orange-500 transition-all shadow-sm" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 flex flex-col md:flex-row gap-3">
                        <button onClick={() => { setPickerTargetDay(day); setIsPickerOpen(true); }} className="flex-1 py-3 bg-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-300 hover:bg-orange-600 hover:text-white transition-all shadow-lg">Browse Vault</button>
                        <button onClick={() => { const n = {...weeklyLogs}; n.weeks[activeWeek].days[day].completed = !n.weeks[activeWeek].days[day].completed; setWeeklyLogs(n); }} className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${weeklyLogs.weeks[activeWeek].days[day].completed ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>LOG SESSION</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </main>
          </div>
        )}

        {view === 'goals' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
            <header className="mb-10"><h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">Goal Tracker</h1></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                <h2 className="text-xl font-black italic mb-6 uppercase flex items-center gap-3 tracking-tighter"><Scale className="text-orange-500" /> Body Weight</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={String(weeklyLogs.globalGoals.weight.current)} onChange={e => updateGlobalGoal('weight.current', e.target.value)} placeholder="Start" className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white outline-none focus:border-orange-500" />
                  <input type="number" value={String(weeklyLogs.globalGoals.weight.target)} onChange={e => updateGlobalGoal('weight.target', e.target.value)} placeholder="Goal" className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-orange-500 outline-none focus:border-orange-500" />
                </div>
              </section>
              <section className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl flex items-center justify-center gap-4">
                <div className="bg-slate-950 h-48 w-full rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden shadow-inner">
                   <input type="file" className="hidden" ref={goalBeforeRef} onChange={e => handleGoalPhotoUpload(e, 'before')} />
                   {weeklyLogs.globalGoals.photos.before ? <img src={String(weeklyLogs.globalGoals.photos.before)} className="w-full h-full object-cover" /> : <button onClick={() => goalBeforeRef.current.click()} className="text-[10px] font-black uppercase text-slate-700 flex flex-col items-center gap-2"><span><Camera /></span> <span>Before Photo</span></button>}
                </div>
                <div className="bg-slate-950 h-48 w-full rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden shadow-inner">
                   <input type="file" className="hidden" ref={goalAfterRef} onChange={e => handleGoalPhotoUpload(e, 'after')} />
                   {weeklyLogs.globalGoals.photos.after ? <img src={String(weeklyLogs.globalGoals.photos.after)} className="w-full h-full object-cover" /> : <button onClick={() => goalAfterRef.current.click()} className="text-[10px] font-black uppercase text-slate-700 flex flex-col items-center gap-2"><span><Camera /></span> <span>Target Photo</span></button>}
                </div>
              </section>
            </div>
            <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl mt-6">
               <h2 className="text-xl font-black italic text-white uppercase tracking-tighter mb-8 flex items-center gap-3"><span><Layers className="text-green-500" /></span> <span>Measurements</span></h2>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                 {Object.keys(weeklyLogs.globalGoals.measurements).map(m => (
                   <div key={m} className="space-y-2">
                     <h3 className="text-xs font-black uppercase text-slate-400 border-b border-slate-800 pb-1 tracking-widest">{String(m)}</h3>
                     <input value={String(weeklyLogs.globalGoals.measurements[m].current)} onChange={(e) => updateGlobalGoal(`measurements.${m}.current`, e.target.value)} placeholder="Start" className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-orange-500" />
                     <input value={String(weeklyLogs.globalGoals.measurements[m].target)} onChange={(e) => updateGlobalGoal(`measurements.${m}.target`, e.target.value)} placeholder="Target" className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-orange-400 outline-none focus:border-orange-500" />
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {view === 'nutrition' && (
          <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* MACRO TARGETS RESTORED */}
            <header className="flex justify-between items-center"><h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">Nutrition Hub</h1></header>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] text-center shadow-2xl"><p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Total Calories</p><p className="text-2xl font-black text-white">{String((calculateDailyTotal().p * 4) + (calculateDailyTotal().c * 4) + (calculateDailyTotal().f * 9))}</p></div>
               {['protein', 'carbs', 'fats'].map((macro) => (
                 <div key={macro} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] text-center shadow-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">{String(macro)}</p>
                   <p className="text-2xl font-black text-white">{String(calculateDailyTotal()[macro === 'protein' ? 'p' : macro === 'carbs' ? 'c' : 'f'])}g</p>
                   <input 
                     type="number" 
                     value={weeklyLogs.nutrition.macros[macro]} 
                     onChange={e => setWeeklyLogs(prev => ({ 
                       ...prev, 
                       nutrition: { 
                         ...prev.nutrition, 
                         macros: { 
                           ...prev.nutrition.macros, 
                           [macro]: e.target.value 
                         }
                       }
                     }))} 
                     className="mt-2 w-20 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs font-black text-orange-500 py-1" 
                   />
                 </div>
               ))}
            </div>
             {Object.keys(weeklyLogs.nutrition.meals).map(meal => (
               <section key={meal} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">{String(meal)}</h3>
                    <button onClick={() => addFoodItem(meal)} className="p-2 bg-slate-800 rounded-full hover:bg-orange-500 transition-all text-white"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-2">
                    {weeklyLogs.nutrition.meals[meal].map(item => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 shadow-inner">
                        <input value={String(item.name)} onChange={e => updateFoodItem(meal, item.id, 'name', e.target.value)} className="col-span-6 bg-transparent text-xs text-white px-2 outline-none focus:border-b border-orange-500" placeholder="Food Name" />
                        <input value={String(item.p)} onChange={e => updateFoodItem(meal, item.id, 'p', e.target.value)} className="col-span-2 bg-slate-900 text-[10px] text-center rounded outline-none" placeholder="P" />
                        <input value={String(item.c)} onChange={e => updateFoodItem(meal, item.id, 'c', e.target.value)} className="col-span-2 bg-slate-900 text-[10px] text-center rounded outline-none" placeholder="C" />
                        <button onClick={() => removeFoodItem(meal, item.id)} className="col-span-2 flex justify-center items-center text-slate-800 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
               </section>
             ))}
          </div>
        )}

        {view === 'library' && (
          <main className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
            <header className="mb-12"><h1 className="text-4xl font-black tracking-tighter text-white italic uppercase tracking-tighter">Vault</h1></header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
              {Object.entries(EXERCISE_DATABASE).map(([category, list]) => (
                <section key={category} className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden h-fit shadow-xl transition-all hover:border-slate-700 shadow-2xl">
                  <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="font-black uppercase text-xs tracking-widest text-slate-400">{String(category)}</h2>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{String(list.length)} Variations</span>
                  </div>
                  <div className="p-3 space-y-1">
                    {list.map((ex, i) => (
                      <div key={i} className="w-full group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-950 transition-all group/vaultitem">
                        <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">{String(ex)}</span>
                        {isTendonSafe(ex) && <span><Star className="w-3 h-3 text-green-500 fill-green-500 shadow-sm shadow-green-500/20" /></span>}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </main>
        )}
      </div>

      <footer className="p-8 text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-800 border-t border-slate-950">
        Training Hub Pro • Refined Phase 1 • Cloud ID: {String(user?.uid || 'Offline')}
      </footer>
    </div>
  );
};

export default App;
