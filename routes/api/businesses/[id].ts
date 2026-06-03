import { define } from "../../../utils.ts";
import { getDenoKvAdapterRaw } from "../../../lib/kv-adapter.ts";

const kv = await Deno.openKv();
const adapter = getDenoKvAdapterRaw(kv);

export const handler = define.handlers({
  async PUT(ctx) {
    const { id } = ctx.params;
    const body = await ctx.req.json();

    const updated = await adapter.update({
      model: "businesses",
      where: [{ field: "id", value: id }],
      update: body,
    });

    if (!updated) return new Response("Not Found", { status: 404 });
    return Response.json(updated);
  },

  async DELETE(ctx) {
    const { id } = ctx.params;
    await adapter.delete({
      model: "businesses",
      where: [{ field: "id", value: id }],
    });
    return new Response(null, { status: 204 });
  },
});
