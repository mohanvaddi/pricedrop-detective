import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import config from '../config';
import { SUPPORTED_SITES } from '../types/enums';
import { CustomError } from '../lib/custom.error';
import { Price, Tracker, User } from '../types/main';

export default class SupabaseUtils {
  client: SupabaseClient<Database> = createClient<Database>(config.SUPABASE_URL, config.SUPABASE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  async createUser(userId: number, username: string) {
    return new Promise<string>(async (resolve, reject) => {
      const { error } = await this.client.from('users').insert({
        id: userId,
        username: username,
      });

      if (error) {
        return reject(
          new CustomError('Unable to add user', 'UserInsertionFailed', {
            error,
          })
        );
      }

      return resolve('User added:\n' + userId);
    });
  }

  async insertTracker(hash: string, userId: number, url: string, website: SUPPORTED_SITES, title: string | null) {
    return new Promise<string>(async (resolve, reject) => {
      const { error } = await this.client.from('trackers').insert({
        id: hash,
        user: userId,
        url,
        website,
        title,
      });

      if (error) {
        return reject(
          new CustomError('Unable to add tracker', 'TrackerInsertionFailed', {
            error,
          })
        );
      }
      return resolve('Tracker added:\n' + hash);
    });
  }

  async fetchTracker(hash: string) {
    return new Promise<Tracker[]>(async (resolve, reject) => {
      const { error, data, count } = await this.client.from('trackers').select().eq('id', hash);
      if (error || count === 0) {
        return reject(
          new CustomError('Unable to get tracker', 'TrackerNotFound', {
            error,
          })
        );
      }
      return resolve(data as unknown as Tracker[]);
    });
  }

  async fetchUser(userId: number) {
    return new Promise<User[]>(async (resolve, reject) => {
      const { error, data, count } = await this.client.from('users').select().eq('id', userId);
      if (error || count === 0) {
        return reject(
          new CustomError('Unable to get user', 'UserNotFound', {
            error,
          })
        );
      }
      return resolve(data as unknown as User[]);
    });
  }

  async updateTracker(hash: string, tracker: Tracker) {
    return new Promise<string>(async (resolve, reject) => {
      const { error } = await this.client
        .from('trackers')
        .update({
          ...tracker,
        })
        .eq('id', hash);

      if (error) {
        return reject(
          new CustomError('Unable to update tracker', 'TrackerUpdateError', {
            error,
          })
        );
      }
      return resolve('Tracker updated:\n' + hash);
    });
  }

  async removeTracker(hash: string) {
    return new Promise<string>(async (resolve, reject) => {
      const { error } = await this.client.from('trackers').delete().eq('id', hash);
      if (error) {
        return reject(
          new CustomError('Unable to delete tracker', 'TrackerNotDeleted', {
            error,
          })
        );
      }
      return resolve('Tracker deleted:\n' + hash);
    });
  }

  async checkIfTrackerExists(hash: string) {
    return new Promise<boolean>(async (resolve, _reject) => {
      try {
        const tracker = await this.fetchTracker(hash);
        if (tracker.length === 0) return resolve(false);
        return resolve(true);
      } catch (error) {
        return resolve(false);
      }
    });
  }

  async checkIfUserExists(userId: number) {
    return new Promise<boolean>(async (resolve, _reject) => {
      try {
        const tracker = await this.fetchUser(userId);
        if (tracker.length === 0) return resolve(false);
        return resolve(true);
      } catch (error) {
        return resolve(false);
      }
    });
  }

  async insertPrice(hash: string, price: number) {
    return new Promise(async (resolve, reject) => {
      const { error } = await this.client.from('prices').insert({
        tracker: hash,
        price: price,
      });
      if (error) {
        return reject(
          new CustomError('Unable to create price', 'PriceNotCreated', {
            error,
          })
        );
      }
      return resolve('Price created:\n' + hash);
    });
  }

  async fetchTrackers() {
    return new Promise<Tracker[]>(async (resolve, reject) => {
      const { data, error } = await this.client.from('trackers').select();
      if (error) {
        return reject(
          new CustomError('Unable to fetch trackers', 'TrackersError', {
            error,
          })
        );
      }
      return resolve(data as Tracker[]);
    });
  }

  async fetchPricesByTracker(hash: string) {
    return new Promise<Price[]>(async (resolve, reject) => {
      const { data, error } = await this.client.from('prices').select().eq('tracker', hash).order('created_at', {
        ascending: true,
      });
      if (error) {
        return reject(
          new CustomError('Unable to fetch prices', 'PricesError', {
            error,
          })
        );
      }
      return resolve(data as Price[]);
    });
  }

  async fetchTrackersByUser(userId: number) {
    return new Promise<Tracker[]>(async (resolve, reject) => {
      const { data, error } = await this.client.from('trackers').select().eq('user', userId);
      if (error) {
        return reject(
          new CustomError('Unable to fetch trackers', 'TrackersError', {
            error,
          })
        );
      }
      return resolve(data as Tracker[]);
    });
  }
}
