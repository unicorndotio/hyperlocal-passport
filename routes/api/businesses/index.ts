import { define } from "../../../utils.ts";
import { getDenoKvAdapterRaw } from "../../../lib/kv-adapter.ts";

const kv = await Deno.openKv();
const adapter = getDenoKvAdapterRaw(kv);

export const handler = define.handlers({
  async GET(ctx) {
    const businesses = await adapter.findMany({ model: "businesses" });
    return Response.json(businesses);
  },

  async POST(ctx) {
    const formData = await ctx.req.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const logo = formData.get("logo") as File;
    const userId = formData.get("userId") as string;

    if (!name || !logo || !userId) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Logo upload would happen here, utilizing the storage client.
    const logoUrl = `http://localhost:8000/api/uploads/${logo.name}`;

    const business = await adapter.create({
      model: "businesses",
      data: {
        name,
        description,
        logoUrl,
        userId,
        createdAt: new Date().toISOString(),
      },
    });

    return Response.json(business, { status: 201 });
  },
});
