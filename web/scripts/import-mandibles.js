// Open localhost:3000 in Chrome (logged in), open DevTools → Console, paste everything below and hit Enter

(async () => {
const SONG_ID = '38672fd4-76c2-42b9-8d82-c7f8aab7fb73';
const SB_URL = 'https://gcxuxypltkhstaedqlto.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeHV4eXBsdGtoc3RhZWRxbHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MzIzMjIsImV4cCI6MjA5OTAwODMyMn0.6H-6jm82NGfXFHBEtdqaNEpX2jh1gT0LjiPNLWoLH18';

const sk = Object.keys(localStorage).find(k => k.includes('auth-token') && k.includes('gcxuxypltkhstaedqlto'));
if (!sk) { console.error('Not logged in'); return; }
const token = JSON.parse(localStorage.getItem(sk))?.access_token;

const [song] = await (await fetch(`${SB_URL}/rest/v1/songs?id=eq.${SONG_ID}&select=*`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } })).json();
if (!song) { console.error('Song not found'); return; }
console.log('Found:', song.title);

const chords = [
  { id: crypto.randomUUID(), name: 'C#5', strings: ['x',5,7,7,'x','x'], barre: null }, // D  → C#
  { id: crypto.randomUUID(), name: 'C5',  strings: ['x',4,7,7,'x','x'], barre: null }, // C# → C  (low)
  { id: crypto.randomUUID(), name: 'Bb5', strings: ['x',2,4,4,'x','x'], barre: null }, // B  → Bb
  { id: crypto.randomUUID(), name: 'Ab5', strings: [5,7,7,'x','x','x'], barre: null }, // A  → Ab
  { id: crypto.randomUUID(), name: 'F#5', strings: [3,5,5,'x','x','x'], barre: null }, // G  → F#
  { id: crypto.randomUUID(), name: 'F5',  strings: [2,4,4,'x','x','x'], barre: null }, // F# → F
  { id: crypto.randomUUID(), name: 'Bb5', strings: [7,9,9,'x','x','x'], barre: null }, // B  → Bb (high shape)
  { id: crypto.randomUUID(), name: 'C5',  strings: [6,8,8,'x','x','x'], barre: null }, // C# → C  (high shape)
  { id: crypto.randomUUID(), name: 'Eb5', strings: [0,2,2,'x','x','x'], barre: null }, // E  → Eb
];
const [CS5,C5,BB5,AB5,FS5,F5,BB5H,C5H,EB5] = chords.map(c => c.id);

const structureRows = [
  { section_label:'Verse',  section_type:'verse',  bar_count:2, lyric_snippet:null,                              chord_progression:[CS5,C5,BB5,AB5,FS5] },
  { section_label:'Chorus', section_type:'chorus', bar_count:2, lyric_snippet:"Your scrambling for tact...",    chord_progression:[F5,FS5,CS5,C5,BB5,AB5] },
  { section_label:'Bridge', section_type:'bridge', bar_count:2, lyric_snippet:"What the hell am I doing...",    chord_progression:[BB5H,C5H,FS5,EB5,F5,AB5] },
  { section_label:'Outro',  section_type:'outro',  bar_count:2, lyric_snippet:"Your never got to know me...",   chord_progression:[CS5,F5,FS5,AB5] },
];

const res = await fetch(`/api/songs/${SONG_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    song: { title:song.title, status:song.status, album:song.album, key:song.key, bpm:song.bpm,
            time_signature:song.time_signature, capo:song.capo, version:song.version, tuning:song.tuning,
            drive_folder_url:song.drive_folder_url, logic_url:song.logic_url,
            lyrics_doc_url:song.lyrics_doc_url, notes:song.notes },
    chords,
    structureRows,
  }),
});
console.log(res.ok ? '✅ Done! Refresh the page.' : '❌ Error:', await res.json());
})();
