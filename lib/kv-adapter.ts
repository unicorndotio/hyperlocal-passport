import { createAdapterFactory } from 'better-auth/adapters'

// Export raw implementation for unit testing without factory wrappers
export const getDenoKvAdapterRaw = (kv: Deno.Kv) => {
  // Define which fields should be indexed for each model
  const INDEXED_FIELDS: Record<string, string[]> = {
    user: ['email', 'cpf'],
    session: ['token', 'userId'],
    account: ['userId', 'providerId'],
    businesses: ['userId'],
  }

  return {
    async create<T extends Record<string, unknown> = Record<string, unknown>>(
      data: { model: string; data: T },
    ): Promise<T> {
      const { model, data: record } = data
      const id = (record.id as string) || crypto.randomUUID()
      const finalRecord = { ...record, id }

      const atomic = kv.atomic().set([model, id], finalRecord)

      // Add secondary indexes
      const indexedFields = INDEXED_FIELDS[model] || []
      for (const field of indexedFields) {
        const val = record[field]
        if (val !== undefined && val !== null) {
          atomic.set([`${model}_by_${field}`, val as Deno.KvKeyPart], id)
        }
      }

      await atomic.commit()
      return finalRecord as unknown as T
    },

    async findOne<T = Record<string, unknown>>(
      data: { model: string; where: { field: string; value: unknown }[] },
    ): Promise<T | null> {
      const { model, where } = data

      // Check if we can use an index
      const indexedFields = INDEXED_FIELDS[model] || []
      const indexable = where.find((w) => indexedFields.includes(w.field))

      if (indexable) {
        const indexKey = [
          `${model}_by_${indexable.field}`,
          indexable.value as Deno.KvKeyPart,
        ]
        const idRes = await kv.get<string>(indexKey)
        if (idRes.value) {
          const res = await kv.get<T>([model, idRes.value])
          if (res.value) {
            // Verify other where clauses if any
            const val = res.value as Record<string, unknown>
            let matches = true
            for (const { field, value } of where) {
              if (val[field] !== value) {
                matches = false
                break
              }
            }
            if (matches) return res.value
          }
        }
        // If index lookup failed or didn't match all criteria, fall back to scan
        // (though usually index lookup is sufficient if the data is consistent)
      }

      // Fallback to O(N) scan
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

      // If we have an indexable field in 'where', we can optimize
      const indexedFields = INDEXED_FIELDS[model] || []
      const indexable = where?.find((w) => indexedFields.includes(w.field))

      if (indexable) {
        const indexKey = [
          `${model}_by_${indexable.field}`,
          indexable.value as Deno.KvKeyPart,
        ]
        const idRes = await kv.get<string>(indexKey)
        if (idRes.value) {
          const res = await kv.get<T>([model, idRes.value])
          if (res.value) {
            const val = res.value as Record<string, unknown>
            let matches = true
            if (where) {
              for (const { field, value } of where) {
                if (val[field] !== value) {
                  matches = false
                  break
                }
              }
            }
            if (matches) return [res.value]
          }
        }
        return []
      }

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
          const updated = { ...val, ...update } as Record<string, unknown>
          const atomic = kv.atomic().set(entry.key, updated)

          // Update secondary indexes
          const indexedFields = INDEXED_FIELDS[model] || []
          for (const field of indexedFields) {
            const oldVal = val[field]
            const newVal = updated[field]

            if (oldVal !== newVal) {
              if (oldVal !== undefined && oldVal !== null) {
                atomic.delete([
                  `${model}_by_${field}`,
                  oldVal as Deno.KvKeyPart,
                ])
              }
              if (newVal !== undefined && newVal !== null) {
                atomic.set(
                  [`${model}_by_${field}`, newVal as Deno.KvKeyPart],
                  val.id as string,
                )
              }
            }
          }

          await atomic.commit()
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
          const updated = { ...val, ...update } as Record<string, unknown>
          const atomic = kv.atomic().set(entry.key, updated)

          // Update secondary indexes
          const indexedFields = INDEXED_FIELDS[model] || []
          for (const field of indexedFields) {
            const oldVal = val[field]
            const newVal = updated[field]

            if (oldVal !== newVal) {
              if (oldVal !== undefined && oldVal !== null) {
                atomic.delete([
                  `${model}_by_${field}`,
                  oldVal as Deno.KvKeyPart,
                ])
              }
              if (newVal !== undefined && newVal !== null) {
                atomic.set(
                  [`${model}_by_${field}`, newVal as Deno.KvKeyPart],
                  val.id as string,
                )
              }
            }
          }

          await atomic.commit()
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
          const atomic = kv.atomic().delete(entry.key)

          // Remove secondary indexes
          const indexedFields = INDEXED_FIELDS[model] || []
          for (const field of indexedFields) {
            const indexVal = val[field]
            if (indexVal !== undefined && indexVal !== null) {
              atomic.delete([
                `${model}_by_${field}`,
                indexVal as Deno.KvKeyPart,
              ])
            }
          }

          await atomic.commit()
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
          const atomic = kv.atomic().delete(entry.key)

          // Remove secondary indexes
          const indexedFields = INDEXED_FIELDS[model] || []
          for (const field of indexedFields) {
            const indexVal = val[field]
            if (indexVal !== undefined && indexVal !== null) {
              atomic.delete([
                `${model}_by_${field}`,
                indexVal as Deno.KvKeyPart,
              ])
            }
          }

          await atomic.commit()
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
