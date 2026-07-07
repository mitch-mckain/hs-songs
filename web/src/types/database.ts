export type SongStatus = 'demo' | 'released' | 'retired'
export type SectionType = 'intro' | 'verse' | 'prehook' | 'chorus' | 'bridge' | 'outro'
export type RiffKind = 'photo' | 'gp_tab'

export interface Song {
  id: string
  title: string
  status: SongStatus
  album: string | null
  key: string | null
  bpm: string | null
  capo: string | null
  tuning: string
  time_signature: string | null
  version: string | null
  drive_folder_url: string | null
  logic_url: string | null
  lyrics_doc_url: string | null
  notes: string | null
  last_updated: string
  created_by: string | null
  updated_by: string | null
  created_at: string
}

export interface SongChord {
  id: string
  song_id: string
  position: number
  name: string
  tuning: string
  strings: (number | 'x')[] // 6 values: fret number, 'x' (muted), or 0 (open)
  barre: { fret: number; fromString: number; toString: number } | null
}

export interface SongStructureRow {
  id: string
  song_id: string
  position: number
  section_label: string
  section_type: SectionType
  bar_count: number | null
  lyric_snippet: string | null
  chord_progression: string[] // ordered array of song_chord ids
}

export interface SongRiff {
  id: string
  song_id: string
  kind: RiffKind
  drive_file_id: string | null
  image_url: string | null
  track_label: string | null
}

export interface UserRole {
  user_id: string
  role: 'editor' | 'viewer'
}

export interface SongWithRelations extends Song {
  song_chords: SongChord[]
  song_structure_rows: SongStructureRow[]
  song_riffs: SongRiff[]
}

// Supabase Database type shape (used for typed client)
export type Database = {
  public: {
    Tables: {
      songs: { Row: Song; Insert: Omit<Song, 'id' | 'created_at' | 'last_updated'>; Update: Partial<Omit<Song, 'id' | 'created_at'>> }
      song_chords: { Row: SongChord; Insert: Omit<SongChord, 'id'>; Update: Partial<Omit<SongChord, 'id'>> }
      song_structure_rows: { Row: SongStructureRow; Insert: Omit<SongStructureRow, 'id'>; Update: Partial<Omit<SongStructureRow, 'id'>> }
      song_riffs: { Row: SongRiff; Insert: Omit<SongRiff, 'id'>; Update: Partial<Omit<SongRiff, 'id'>> }
      user_roles: { Row: UserRole; Insert: UserRole; Update: Partial<UserRole> }
    }
    Views: {}
    Functions: {}
    Enums: {
      song_status: SongStatus
      section_type: SectionType
      riff_kind: RiffKind
    }
  }
}
