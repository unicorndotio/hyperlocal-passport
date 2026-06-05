import { createAdapterFactory } from 'better-auth/adapters'

// Export raw implementation for unit testing without factory wrappers
export const getDenoKvAdapterRaw = (kv: Deno.Kv) => {
  return {
    async create<T extends Record<string, unknown> = Record<string, unknown>>(
      data: { model: string; data: T },
    ): Promise<T> {
      const { model, data: record } = data
      const id = record.id || crypto.randomUUID()
      const finalRecord = { ...record, id }
      await kv.set([model, id as string], finalRecord)
      return finalRecord as unknown as T
    },

    async findOne<T = Record<string, unknown>>(
      data: { model: string; where: { field: string; value: unknown }[] },
    ): Promise<T | null> {
      const { model, where } = data
      const entries = kv.list({ prefix: [model] })
      for await (const entry of entries) {
        const val = entry.value as Record<string, unknown>
        let matches = true
        for (const { field, value } of where) {
          if (val[field] !== value) {
            matches = false
            break
          }
        }
        if (matches) return val as unknown as T
      }
      return null
    },

    async findMany<T = Record<string, unknown>>(
      data: { model: string; where?: { field: string; value: unknown }[] },
    ): Promise<T[]> {
      const { model, where } = data
      const entries = kv.list({ prefix: [model] })
      const results: Record<string, unknown>[] = []
      for await (const entry of entries) {
        const val = entry.value as Record<string, unknown>
        let matches = true
        if (where) {
          for (const { field, value } of where) {
            if (val[field] !== value) {
              matches = false
              break
            }
          }
        }
        if (matches) results.push(val)
      }
      return results as unknown as T[]
    },

    async update<T = Record<string, unknown>>(
      data: {
        model: string
        where: { field: string; value: unknown }[]
        update: T
      },
    ): Promise<T | null> {
      const { model, where, update } = data
      const entries = kv.list({ prefix: [model] })
      for await (const entry of entries) {
        const val = entry.value as Record<string, unknown>
        let matches = true
        for (const { field, value } of where) {
          if (val[field] !== value) {
            matches = false
            break
          }
        }
        if (matches) {
          const updated = { ...val, ...update }
          await kv.set(entry.key, updated)
          return updated as unknown as T
        }
      }
      return null
    },

    async updateMany<T = Record<string, unknown>>(
      data: {
        model: string
        where: { field: string; value: unknown }[]
        update: T
      },
    ): Promise<number> {
      const { model, where, update } = data
      const entries = kv.list({ prefix: [model] })
      let count = 0
      for await (const entry of entries) {
        const val = entry.value as Record<string, unknown>
        let matches = true
        for (const { field, value } of where) {
          if (val[field] !== value) {
            matches = false
            break
          }
        }
        if (matches) {
          const updated = { ...val, ...update }
          await kv.set(entry.key, updated)
          count++
        }
      }
      return count
    },

    async delete(
      data: { model: string; where: { field: string; value: unknown }[] },
    ) {
      const { model, where } = data
      const entries = kv.list({ prefix: [model] })
      for await (const entry of entries) {
        const val = entry.value as Record<string, unknown>
        let matches = true
        for (const { field, value } of where) {
          if (val[field] !== value) {
            matches = false
            break
          }
        }
        if (matches) {
          await kv.delete(entry.key)
          return
        }
      }
    },

    async deleteMany(
      data: { model: string; where: { field: string; value: unknown }[] },
    ) {
      const { model, where } = data
      const entries = kv.list({ prefix: [model] })
      let count = 0
      for await (const entry of entries) {
        const val = entry.value as Record<string, unknown>
        let matches = true
        if (where) {
          for (const { field, value } of where) {
            if (val[field] !== value) {
              matches = false
              break
            }
          }
        }
        if (matches) {
          await kv.delete(entry.key)
          count++
        }
      }
      return count
    },

    async count(
      data: { model: string; where?: { field: string; value: unknown }[] },
    ) {
      const { model, where } = data
      const entries = kv.list({ prefix: [model] })
      let count = 0
      for await (const entry of entries) {
        const val = entry.value as Record<string, unknown>
        let matches = true
        if (where) {
          for (const { field, value } of where) {
            if (val[field] !== value) {
              matches = false
              break
            }
          }
        }
        if (matches) {
          count++
        }
      }
      return count
    },
  }
}

export const denoKvAdapter = (kv: Deno.Kv) =>
  createAdapterFactory({
    config: {
      adapterId: 'deno-kv',
    },
    adapter: (_options) => {
      return getDenoKvAdapterRaw(kv)
    },
  })
