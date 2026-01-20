export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          engagement_score: number | null
          event_id: string | null
          id: string
          like_count: number | null
          metadata: Json | null
          target_user_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engagement_score?: number | null
          event_id?: string | null
          id?: string
          like_count?: number | null
          metadata?: Json | null
          target_user_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          engagement_score?: number | null
          event_id?: string | null
          id?: string
          like_count?: number | null
          metadata?: Json | null
          target_user_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_likes: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_likes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      bouts: {
        Row: {
          blue_fighter_ufcstats_id: string
          blue_name: string
          card_snapshot: number
          created_at: string
          event_id: string
          id: string
          last_synced_at: string | null
          order_index: number
          red_fighter_ufcstats_id: string
          red_name: string
          scheduled_rounds: number | null
          status: string
          ufcstats_fight_id: string
          weight_class: string | null
        }
        Insert: {
          blue_fighter_ufcstats_id: string
          blue_name: string
          card_snapshot?: number
          created_at?: string
          event_id: string
          id?: string
          last_synced_at?: string | null
          order_index: number
          red_fighter_ufcstats_id: string
          red_name: string
          scheduled_rounds?: number | null
          status?: string
          ufcstats_fight_id: string
          weight_class?: string | null
        }
        Update: {
          blue_fighter_ufcstats_id?: string
          blue_name?: string
          card_snapshot?: number
          created_at?: string
          event_id?: string
          id?: string
          last_synced_at?: string | null
          order_index?: number
          red_fighter_ufcstats_id?: string
          red_name?: string
          scheduled_rounds?: number | null
          status?: string
          ufcstats_fight_id?: string
          weight_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bouts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_date: string
          id: string
          last_synced_at: string | null
          location: string | null
          name: string
          status: string
          ufcstats_event_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          last_synced_at?: string | null
          location?: string | null
          name: string
          status?: string
          ufcstats_event_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          last_synced_at?: string | null
          location?: string | null
          name?: string
          status?: string
          ufcstats_event_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mutes: {
        Row: {
          created_at: string
          id: string
          muted_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          body: string
          clicked_at: string | null
          data: Json | null
          id: string
          read_at: string | null
          sent_at: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          clicked_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          sent_at?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          clicked_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          sent_at?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          event_reminder_1h: boolean
          event_reminder_24h: boolean
          friend_activity: boolean
          new_follower: boolean
          picks_graded: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          streak_at_risk: boolean
          timezone: string | null
          updated_at: string
          user_id: string
          weekly_recap: boolean
        }
        Insert: {
          created_at?: string
          event_reminder_1h?: boolean
          event_reminder_24h?: boolean
          friend_activity?: boolean
          new_follower?: boolean
          picks_graded?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          streak_at_risk?: boolean
          timezone?: string | null
          updated_at?: string
          user_id: string
          weekly_recap?: boolean
        }
        Update: {
          created_at?: string
          event_reminder_1h?: boolean
          event_reminder_24h?: boolean
          friend_activity?: boolean
          new_follower?: boolean
          picks_graded?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          streak_at_risk?: boolean
          timezone?: string | null
          updated_at?: string
          user_id?: string
          weekly_recap?: boolean
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          batch_count: number | null
          batch_key: string | null
          body: string
          created_at: string
          data: Json | null
          error: string | null
          id: string
          priority: number | null
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          batch_count?: number | null
          batch_key?: string | null
          body: string
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          priority?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          batch_count?: number | null
          batch_key?: string | null
          body?: string
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          priority?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      picks: {
        Row: {
          bout_id: string
          created_at: string
          event_id: string
          id: string
          is_correct_method: boolean | null
          is_correct_round: boolean | null
          locked_at: string | null
          picked_corner: string
          picked_method: string | null
          picked_round: number | null
          score: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bout_id: string
          created_at?: string
          event_id: string
          id?: string
          is_correct_method?: boolean | null
          is_correct_round?: boolean | null
          locked_at?: string | null
          picked_corner: string
          picked_method?: string | null
          picked_round?: number | null
          score?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bout_id?: string
          created_at?: string
          event_id?: string
          id?: string
          is_correct_method?: boolean | null
          is_correct_round?: boolean | null
          locked_at?: string | null
          picked_corner?: string
          picked_method?: string | null
          picked_round?: number | null
          score?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "picks_bout_id_fkey"
            columns: ["bout_id"]
            isOneToOne: false
            referencedRelation: "bouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          depth: number
          id: string
          like_count: number
          parent_id: string | null
          post_id: string
          reply_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          depth?: number
          id?: string
          like_count?: number
          parent_id?: string | null
          post_id: string
          reply_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          depth?: number
          id?: string
          like_count?: number
          parent_id?: string | null
          post_id?: string
          reply_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          post_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          post_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body: string | null
          bout_id: string | null
          comment_count: number
          created_at: string
          engagement_score: number
          event_id: string | null
          id: string
          is_public: boolean
          like_count: number
          post_type: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          bout_id?: string | null
          comment_count?: number
          created_at?: string
          engagement_score?: number
          event_id?: string | null
          id?: string
          is_public?: boolean
          like_count?: number
          post_type?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          bout_id?: string | null
          comment_count?: number
          created_at?: string
          engagement_score?: number
          event_id?: string | null
          id?: string
          is_public?: boolean
          like_count?: number
          post_type?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_bout_id_fkey"
            columns: ["bout_id"]
            isOneToOne: false
            referencedRelation: "bouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          created_at: string
          id: string
          picks_visibility: string
          profile_visibility: string
          stats_visibility: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          picks_visibility?: string
          profile_visibility?: string
          stats_visibility?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          picks_visibility?: string
          profile_visibility?: string
          stats_visibility?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          is_active: boolean
          last_used_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          action_taken: string | null
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          action_taken?: string | null
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          action_taken?: string | null
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          bout_id: string
          details: string | null
          method: string | null
          round: number | null
          synced_at: string
          time: string | null
          winner_corner: string | null
        }
        Insert: {
          bout_id: string
          details?: string | null
          method?: string | null
          round?: number | null
          synced_at?: string
          time?: string | null
          winner_corner?: string | null
        }
        Update: {
          bout_id?: string
          details?: string | null
          method?: string | null
          round?: number | null
          synced_at?: string
          time?: string | null
          winner_corner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_bout_id_fkey"
            columns: ["bout_id"]
            isOneToOne: true
            referencedRelation: "bouts"
            referencedColumns: ["id"]
          },
        ]
      }
      ufc_events: {
        Row: {
          created_at: string
          event_date: string | null
          event_id: string
          location: string | null
          name: string
          source_snapshot_id: string
          ufcstats_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          event_id: string
          location?: string | null
          name: string
          source_snapshot_id: string
          ufcstats_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_date?: string | null
          event_id?: string
          location?: string | null
          name?: string
          source_snapshot_id?: string
          ufcstats_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ufc_events_source_snapshot_id_fkey"
            columns: ["source_snapshot_id"]
            isOneToOne: false
            referencedRelation: "ufc_source_snapshots"
            referencedColumns: ["snapshot_id"]
          },
        ]
      }
      ufc_fight_stats: {
        Row: {
          body_attempted: number | null
          body_landed: number | null
          clinch_attempted: number | null
          clinch_landed: number | null
          created_at: string
          ctrl_time_seconds: number | null
          distance_attempted: number | null
          distance_landed: number | null
          fight_id: string
          fighter_id: string
          ground_attempted: number | null
          ground_landed: number | null
          head_attempted: number | null
          head_landed: number | null
          id: string
          is_total: boolean
          knockdowns: number | null
          leg_attempted: number | null
          leg_landed: number | null
          opponent_id: string | null
          reversals: number | null
          round: number | null
          sig_str_attempted: number | null
          sig_str_landed: number | null
          source_snapshot_id: string
          sub_attempts: number | null
          td_attempted: number | null
          td_landed: number | null
          total_str_attempted: number | null
          total_str_landed: number | null
        }
        Insert: {
          body_attempted?: number | null
          body_landed?: number | null
          clinch_attempted?: number | null
          clinch_landed?: number | null
          created_at?: string
          ctrl_time_seconds?: number | null
          distance_attempted?: number | null
          distance_landed?: number | null
          fight_id: string
          fighter_id: string
          ground_attempted?: number | null
          ground_landed?: number | null
          head_attempted?: number | null
          head_landed?: number | null
          id: string
          is_total?: boolean
          knockdowns?: number | null
          leg_attempted?: number | null
          leg_landed?: number | null
          opponent_id?: string | null
          reversals?: number | null
          round?: number | null
          sig_str_attempted?: number | null
          sig_str_landed?: number | null
          source_snapshot_id: string
          sub_attempts?: number | null
          td_attempted?: number | null
          td_landed?: number | null
          total_str_attempted?: number | null
          total_str_landed?: number | null
        }
        Update: {
          body_attempted?: number | null
          body_landed?: number | null
          clinch_attempted?: number | null
          clinch_landed?: number | null
          created_at?: string
          ctrl_time_seconds?: number | null
          distance_attempted?: number | null
          distance_landed?: number | null
          fight_id?: string
          fighter_id?: string
          ground_attempted?: number | null
          ground_landed?: number | null
          head_attempted?: number | null
          head_landed?: number | null
          id?: string
          is_total?: boolean
          knockdowns?: number | null
          leg_attempted?: number | null
          leg_landed?: number | null
          opponent_id?: string | null
          reversals?: number | null
          round?: number | null
          sig_str_attempted?: number | null
          sig_str_landed?: number | null
          source_snapshot_id?: string
          sub_attempts?: number | null
          td_attempted?: number | null
          td_landed?: number | null
          total_str_attempted?: number | null
          total_str_landed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ufc_fight_stats_fight_id_fkey"
            columns: ["fight_id"]
            isOneToOne: false
            referencedRelation: "ufc_fights"
            referencedColumns: ["fight_id"]
          },
          {
            foreignKeyName: "ufc_fight_stats_fighter_id_fkey"
            columns: ["fighter_id"]
            isOneToOne: false
            referencedRelation: "ufc_fighters"
            referencedColumns: ["fighter_id"]
          },
          {
            foreignKeyName: "ufc_fight_stats_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "ufc_fighters"
            referencedColumns: ["fighter_id"]
          },
          {
            foreignKeyName: "ufc_fight_stats_source_snapshot_id_fkey"
            columns: ["source_snapshot_id"]
            isOneToOne: false
            referencedRelation: "ufc_source_snapshots"
            referencedColumns: ["snapshot_id"]
          },
        ]
      }
      ufc_fighters: {
        Row: {
          created_at: string
          decision_wins: number | null
          dob: string | null
          fighter_id: string
          first_name: string | null
          full_name: string
          height_inches: number | null
          ko_percentage: number | null
          ko_tko_wins: number | null
          last_name: string | null
          nickname: string | null
          ranking: number | null
          reach_inches: number | null
          record_draws: number | null
          record_losses: number | null
          record_nc: number | null
          record_wins: number | null
          sapm: number | null
          slpm: number | null
          source_snapshot_id: string
          stance: string | null
          str_acc: number | null
          str_def: number | null
          sub_avg: number | null
          sub_percentage: number | null
          submission_wins: number | null
          td_acc: number | null
          td_avg: number | null
          td_def: number | null
          ufcstats_url: string | null
          updated_at: string
          weight_class: string | null
          weight_lbs: number | null
        }
        Insert: {
          created_at?: string
          decision_wins?: number | null
          dob?: string | null
          fighter_id: string
          first_name?: string | null
          full_name: string
          height_inches?: number | null
          ko_percentage?: number | null
          ko_tko_wins?: number | null
          last_name?: string | null
          nickname?: string | null
          ranking?: number | null
          reach_inches?: number | null
          record_draws?: number | null
          record_losses?: number | null
          record_nc?: number | null
          record_wins?: number | null
          sapm?: number | null
          slpm?: number | null
          source_snapshot_id: string
          stance?: string | null
          str_acc?: number | null
          str_def?: number | null
          sub_avg?: number | null
          sub_percentage?: number | null
          submission_wins?: number | null
          td_acc?: number | null
          td_avg?: number | null
          td_def?: number | null
          ufcstats_url?: string | null
          updated_at?: string
          weight_class?: string | null
          weight_lbs?: number | null
        }
        Update: {
          created_at?: string
          decision_wins?: number | null
          dob?: string | null
          fighter_id?: string
          first_name?: string | null
          full_name?: string
          height_inches?: number | null
          ko_percentage?: number | null
          ko_tko_wins?: number | null
          last_name?: string | null
          nickname?: string | null
          ranking?: number | null
          reach_inches?: number | null
          record_draws?: number | null
          record_losses?: number | null
          record_nc?: number | null
          record_wins?: number | null
          sapm?: number | null
          slpm?: number | null
          source_snapshot_id?: string
          stance?: string | null
          str_acc?: number | null
          str_def?: number | null
          sub_avg?: number | null
          sub_percentage?: number | null
          submission_wins?: number | null
          td_acc?: number | null
          td_avg?: number | null
          td_def?: number | null
          ufcstats_url?: string | null
          updated_at?: string
          weight_class?: string | null
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ufc_fighters_source_snapshot_id_fkey"
            columns: ["source_snapshot_id"]
            isOneToOne: false
            referencedRelation: "ufc_source_snapshots"
            referencedColumns: ["snapshot_id"]
          },
        ]
      }
      ufc_fights: {
        Row: {
          blue_fighter_id: string | null
          blue_fighter_name: string | null
          bout_order: number | null
          created_at: string
          event_id: string
          fight_id: string
          is_title_fight: boolean | null
          loser_fighter_id: string | null
          red_fighter_id: string | null
          red_fighter_name: string | null
          referee: string | null
          result_method: string | null
          result_method_details: string | null
          result_round: number | null
          result_time_seconds: number | null
          scheduled_rounds: number | null
          source_snapshot_id: string
          ufcstats_url: string | null
          updated_at: string
          weight_class: string | null
          winner_fighter_id: string | null
        }
        Insert: {
          blue_fighter_id?: string | null
          blue_fighter_name?: string | null
          bout_order?: number | null
          created_at?: string
          event_id: string
          fight_id: string
          is_title_fight?: boolean | null
          loser_fighter_id?: string | null
          red_fighter_id?: string | null
          red_fighter_name?: string | null
          referee?: string | null
          result_method?: string | null
          result_method_details?: string | null
          result_round?: number | null
          result_time_seconds?: number | null
          scheduled_rounds?: number | null
          source_snapshot_id: string
          ufcstats_url?: string | null
          updated_at?: string
          weight_class?: string | null
          winner_fighter_id?: string | null
        }
        Update: {
          blue_fighter_id?: string | null
          blue_fighter_name?: string | null
          bout_order?: number | null
          created_at?: string
          event_id?: string
          fight_id?: string
          is_title_fight?: boolean | null
          loser_fighter_id?: string | null
          red_fighter_id?: string | null
          red_fighter_name?: string | null
          referee?: string | null
          result_method?: string | null
          result_method_details?: string | null
          result_round?: number | null
          result_time_seconds?: number | null
          scheduled_rounds?: number | null
          source_snapshot_id?: string
          ufcstats_url?: string | null
          updated_at?: string
          weight_class?: string | null
          winner_fighter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ufc_fights_blue_fighter_id_fkey"
            columns: ["blue_fighter_id"]
            isOneToOne: false
            referencedRelation: "ufc_fighters"
            referencedColumns: ["fighter_id"]
          },
          {
            foreignKeyName: "ufc_fights_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ufc_events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ufc_fights_loser_fighter_id_fkey"
            columns: ["loser_fighter_id"]
            isOneToOne: false
            referencedRelation: "ufc_fighters"
            referencedColumns: ["fighter_id"]
          },
          {
            foreignKeyName: "ufc_fights_red_fighter_id_fkey"
            columns: ["red_fighter_id"]
            isOneToOne: false
            referencedRelation: "ufc_fighters"
            referencedColumns: ["fighter_id"]
          },
          {
            foreignKeyName: "ufc_fights_source_snapshot_id_fkey"
            columns: ["source_snapshot_id"]
            isOneToOne: false
            referencedRelation: "ufc_source_snapshots"
            referencedColumns: ["snapshot_id"]
          },
          {
            foreignKeyName: "ufc_fights_winner_fighter_id_fkey"
            columns: ["winner_fighter_id"]
            isOneToOne: false
            referencedRelation: "ufc_fighters"
            referencedColumns: ["fighter_id"]
          },
        ]
      }
      ufc_source_snapshots: {
        Row: {
          fetched_at: string
          git_ref: string | null
          notes: string | null
          row_counts: Json | null
          snapshot_id: string
          source: string
        }
        Insert: {
          fetched_at?: string
          git_ref?: string | null
          notes?: string | null
          row_counts?: Json | null
          snapshot_id: string
          source?: string
        }
        Update: {
          fetched_at?: string
          git_ref?: string | null
          notes?: string | null
          row_counts?: Json | null
          snapshot_id?: string
          source?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          target_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          accuracy_pct: number
          best_streak: number
          correct_method: number | null
          correct_round: number | null
          correct_winner: number
          current_streak: number
          total_picks: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_pct?: number
          best_streak?: number
          correct_method?: number | null
          correct_round?: number | null
          correct_winner?: number
          current_streak?: number
          total_picks?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_pct?: number
          best_streak?: number
          correct_method?: number | null
          correct_round?: number | null
          correct_winner?: number
          current_streak?: number
          total_picks?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          email: string
          id: string
          source: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      waitlist_rate_limits: {
        Row: {
          first_request_at: string | null
          ip_address: string
          last_request_at: string | null
          request_count: number | null
        }
        Insert: {
          first_request_at?: string | null
          ip_address: string
          last_request_at?: string | null
          request_count?: number | null
        }
        Update: {
          first_request_at?: string | null
          ip_address?: string
          last_request_at?: string | null
          request_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_engagement_score: {
        Args: { activity_type: string; metadata: Json }
        Returns: number
      }
      calculate_engagement_with_decay: {
        Args: { p_base_score: number; p_created_at: string }
        Returns: number
      }
      call_edge_function: {
        Args: { function_name: string; params?: string }
        Returns: number
      }
      create_activity: {
        Args: {
          p_event_id?: string
          p_metadata?: Json
          p_target_user_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_comment: {
        Args: { p_body: string; p_parent_id?: string; p_post_id: string }
        Returns: string
      }
      create_fight_discussion_post: {
        Args: { p_bout_id: string; p_event_id: string; p_title?: string }
        Returns: string
      }
      create_post: {
        Args: { p_body?: string; p_image_urls?: string[]; p_title: string }
        Returns: string
      }
      delete_comment: { Args: { p_comment_id: string }; Returns: boolean }
      delete_post: { Args: { p_post_id: string }; Returns: boolean }
      delete_user_account: {
        Args: { confirmation_text: string }
        Returns: Json
      }
      disable_pick_lock_trigger: { Args: never; Returns: undefined }
      enable_pick_lock_trigger: { Args: never; Returns: undefined }
      fill_missing_fighter_records: { Args: never; Returns: undefined }
      follow_user: { Args: { p_target_user_id: string }; Returns: Json }
      get_admin_role: { Args: never; Returns: string }
      get_admin_users_with_stats: {
        Args: { limit_count?: number; search_term?: string }
        Returns: {
          avatar_url: string
          correct_picks: number
          created_at: string
          id: string
          is_banned: boolean
          report_count: number
          total_picks: number
          username: string
        }[]
      }
      get_batch_community_pick_percentages: {
        Args: { bout_ids: string[] }
        Returns: {
          fight_id: string
          fighter_a_percentage: number
          fighter_a_picks: number
          fighter_b_percentage: number
          fighter_b_picks: number
          total_picks: number
        }[]
      }
      get_blocked_users: {
        Args: never
        Returns: {
          avatar_url: string
          blocked_at: string
          user_id: string
          username: string
        }[]
      }
      get_community_pick_percentages: {
        Args: { fight_id_input: string }
        Returns: {
          fighter_a_percentage: number
          fighter_a_picks: number
          fighter_b_percentage: number
          fighter_b_picks: number
          total_picks: number
        }[]
      }
      get_discover_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          activity_type: string
          avatar_url: string
          created_at: string
          description: string
          engagement_score: number
          id: string
          is_liked: boolean
          like_count: number
          metadata: Json
          title: string
          user_id: string
          username: string
        }[]
      }
      get_email_by_username: {
        Args: { username_input: string }
        Returns: string
      }
      get_fighter_profile_and_history: {
        Args: { p_fighter_id: string }
        Returns: Json
      }
      get_following_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          activity_type: string
          avatar_url: string
          created_at: string
          description: string
          engagement_score: number
          id: string
          is_liked: boolean
          like_count: number
          metadata: Json
          title: string
          user_id: string
          username: string
        }[]
      }
      get_following_posts_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_username: string
          body: string
          bout_id: string
          comment_count: number
          created_at: string
          engagement_score: number
          event_id: string
          event_name: string
          fighter_a_name: string
          fighter_b_name: string
          id: string
          images: Json
          is_public: boolean
          like_count: number
          post_type: string
          title: string
          updated_at: string
          user_has_liked: boolean
          user_id: string
        }[]
      }
      get_following_posts_feed_for_user: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_username: string
          body: string
          bout_id: string
          comment_count: number
          created_at: string
          engagement_score: number
          event_id: string
          event_name: string
          fighter_a_name: string
          fighter_b_name: string
          id: string
          images: Json
          is_public: boolean
          like_count: number
          post_type: string
          title: string
          updated_at: string
          user_has_liked: boolean
          user_id: string
        }[]
      }
      get_friend_requests: {
        Args: never
        Returns: {
          accuracy: number
          correct_picks: number
          from_user_id: string
          request_id: string
          requested_at: string
          total_picks: number
          username: string
        }[]
      }
      get_friends: {
        Args: never
        Returns: {
          accuracy: number
          became_friends_at: string
          correct_picks: number
          friend_user_id: string
          total_picks: number
          username: string
        }[]
      }
      get_friends_leaderboard: {
        Args: never
        Returns: {
          accuracy: number
          avatar_url: string
          correct_picks: number
          rank: number
          total_picks: number
          user_id: string
          username: string
        }[]
      }
      get_global_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          accuracy: number
          avatar_url: string
          correct_picks: number
          rank: number
          total_picks: number
          user_id: string
          username: string
        }[]
      }
      get_muted_users: {
        Args: { p_user_id?: string }
        Returns: {
          avatar_url: string
          created_at: string
          id: string
          muted_user_id: string
          username: string
        }[]
      }
      get_new_activity_count: {
        Args: { since_timestamp: string }
        Returns: number
      }
      get_pending_notifications: {
        Args: { limit_count?: number }
        Returns: {
          body: string
          data: Json
          notification_id: string
          title: string
          tokens: string[]
          type: string
          user_id: string
        }[]
      }
      get_pending_reports: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          details: string
          reason: string
          report_count: number
          report_id: string
          reported_user_id: string
          reported_username: string
          reporter_username: string
          status: string
        }[]
      }
      get_post_with_comments: {
        Args: { p_comment_limit?: number; p_post_id: string }
        Returns: Json
      }
      get_posts_feed:
        | {
            Args: { p_limit?: number; p_offset?: number }
            Returns: {
              author_avatar_url: string
              author_display_name: string
              author_username: string
              body: string
              bout_id: string
              comment_count: number
              created_at: string
              engagement_score: number
              event_id: string
              event_name: string
              fighter_a_name: string
              fighter_b_name: string
              id: string
              images: Json
              is_public: boolean
              like_count: number
              post_type: string
              title: string
              updated_at: string
              user_has_liked: boolean
              user_id: string
            }[]
          }
        | {
            Args: { p_limit?: number; p_offset?: number; p_sort_by?: string }
            Returns: {
              author_avatar_url: string
              author_display_name: string
              author_username: string
              body: string
              bout_id: string
              comment_count: number
              created_at: string
              engagement_score: number
              event_id: string
              event_name: string
              fighter_a_name: string
              fighter_b_name: string
              id: string
              images: Json
              is_public: boolean
              like_count: number
              post_type: string
              title: string
              updated_at: string
              user_has_liked: boolean
              user_id: string
            }[]
          }
      get_trending_users: {
        Args: { p_limit?: number }
        Returns: {
          accuracy: number
          avatar_url: string
          correct_picks: number
          current_streak: number
          is_following: boolean
          recent_score: number
          total_picks: number
          user_id: string
          username: string
        }[]
      }
      get_user_posts: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_username: string
          body: string
          bout_id: string
          comment_count: number
          created_at: string
          engagement_score: number
          event_id: string
          event_name: string
          fighter_a_name: string
          fighter_b_name: string
          id: string
          images: Json
          is_public: boolean
          like_count: number
          post_type: string
          title: string
          updated_at: string
          user_has_liked: boolean
          user_id: string
        }[]
      }
      get_user_suggestions: {
        Args: { limit_count?: number }
        Returns: {
          accuracy_pct: number
          avatar_url: string
          mutual_follows: number
          reason: string
          total_picks: number
          user_id: string
          username: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_blocked: { Args: { user_a: string; user_b: string }; Returns: boolean }
      is_event_locked: { Args: { target_event_id: string }; Returns: boolean }
      is_muted: {
        Args: { by_user_id: string; check_user_id: string }
        Returns: boolean
      }
      mark_notification_sent: {
        Args: {
          error_message?: string
          notification_ids: string[]
          success?: boolean
        }
        Returns: undefined
      }
      process_batched_notifications: { Args: never; Returns: number }
      queue_notification: {
        Args: {
          p_batch_key?: string
          p_body: string
          p_data?: Json
          p_priority?: number
          p_scheduled_for?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      recalculate_user_stats: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      review_report: {
        Args: {
          action_taken_input?: string
          admin_notes_input?: string
          new_status: string
          report_id_input: string
        }
        Returns: boolean
      }
      search_ufc_fighters: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          fighter_id: string
          full_name: string
          nickname: string
          record: string
          weight_lbs: number
        }[]
      }
      search_users: {
        Args: { limit_count?: number; search_term: string }
        Returns: {
          accuracy: number
          avatar_url: string
          correct_picks: number
          is_following: boolean
          total_picks: number
          user_id: string
          username: string
        }[]
      }
      toggle_activity_like: { Args: { p_activity_id: string }; Returns: Json }
      toggle_comment_like: { Args: { p_comment_id: string }; Returns: Json }
      toggle_post_like: { Args: { p_post_id: string }; Returns: Json }
      unfollow_user: { Args: { p_target_user_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// =============================================================================
// CONVENIENCE TYPE EXPORTS
// These are derived types for easy import throughout the app
// =============================================================================

/** Event row type from the events table */
export type Event = Database['public']['Tables']['events']['Row'];

/** Bout row type from the bouts table */
export type Bout = Database['public']['Tables']['bouts']['Row'];

/** Pick row type from the picks table */
export type Pick = Database['public']['Tables']['picks']['Row'];

/** Pick insert type for creating new picks */
export type PickInsert = Database['public']['Tables']['picks']['Insert'];

/** Result row type from the results table */
export type Result = Database['public']['Tables']['results']['Row'];

/** Profile row type from the profiles table */
export type Profile = Database['public']['Tables']['profiles']['Row'];

/** User stats row type from the user_stats table */
export type UserStats = Database['public']['Tables']['user_stats']['Row'];

/** UFC Fighter row type from the ufc_fighters table */
export type UFCFighter = Database['public']['Tables']['ufc_fighters']['Row'];

/** UFC Fighter search result from the search_ufc_fighters RPC function */
export type UFCFighterSearchResult = {
  fighter_id: string;
  full_name: string;
  nickname: string | null;
  record: string;
  weight_lbs: number | null;
};

/** Bout with optional user pick attached (for event detail screens) */
export type BoutWithPick = Bout & {
  result?: Result | null;
  pick?: Pick | null;
  /** Red corner fighter record (e.g., "24-4") */
  red_record?: string | null;
  /** Blue corner fighter record (e.g., "21-3") */
  blue_record?: string | null;
};

/** Fight history item for fighter profiles (returned by get_fighter_profile_and_history RPC) */
export type FightHistoryItem = {
  fight_id: string;
  event_name: string;
  event_date: string;
  opponent_name: string;
  opponent_id: string | null;
  result: 'Win' | 'Loss' | 'Draw' | 'NC';
  result_method: string | null;
  result_method_details: string | null;
  result_round: number | null;
  result_time_seconds: number | null;
  weight_class: string | null;
  is_title_fight: boolean;
  totals?: {
    sig_str_landed?: number;
    sig_str_attempted?: number;
    td_landed?: number;
    td_attempted?: number;
    ctrl_time_seconds?: number;
    knockdowns?: number;
  } | null;
};

/** Fighter record breakdown */
export type FighterRecord = {
  wins: number;
  losses: number;
  draws: number;
  nc: number;
};

/** Fighter career stats */
export type FighterCareerStats = {
  str_acc: number | null;
  str_def: number | null;
  slpm: number | null;
  sapm: number | null;
  td_acc: number | null;
  td_def: number | null;
  td_avg: number | null;
  sub_avg: number | null;
};

/** Fighter profile with nested record and career_stats (returned by get_fighter_profile_and_history RPC) */
export type FighterProfile = {
  fighter_id: string;
  full_name: string;
  nickname: string | null;
  dob: string | null;
  height_inches: number | null;
  reach_inches: number | null;
  weight_lbs: number | null;
  weight_class: string | null;
  stance: string | null;
  ranking: number | null;
  record: FighterRecord;
  career_stats: FighterCareerStats | null;
};

/** Fighter profile with fight history (returned by get_fighter_profile_and_history RPC) */
export type FighterProfileAndHistory = {
  fighter: FighterProfile | null;
  history: FightHistoryItem[];
};
