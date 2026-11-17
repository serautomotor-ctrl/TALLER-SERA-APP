import type { Prisma, $Enums } from "@/app/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Suma (qty > 0) o resta (qty < 0) existencias de un articulo y deja apunte en el historial.
 * Se permite quedar en negativo: asi se ve que se ha gastado algo que no constaba en el almacen.
 */
export async function moveStock(
  tx: Tx,
  input: {
    articleId: string;
    qty: number;
    kind: $Enums.StockMovementKind;
    unitCost?: number | null;
    note?: string;
    orderId?: string | null;
    plate?: string;
  },
) {
  if (!input.qty) return;
  const article = await tx.article.update({
    where: { id: input.articleId },
    data: { stock: { increment: input.qty } },
    select: { stock: true },
  });
  await tx.stockMovement.create({
    data: {
      articleId: input.articleId,
      kind: input.kind,
      qty: input.qty,
      stockAfter: article.stock,
      unitCost: input.unitCost ?? null,
      note: input.note ?? "",
      orderId: input.orderId ?? null,
      plate: input.plate ?? "",
    },
  });
}

export type StockLevel = "sin_contar" | "ok" | "bajo" | "agotado";

/**
 * Un articulo esta "sin contar" mientras no tenga ningun movimiento ni stock minimo:
 * asi los articulos que ya existian no salen como agotados hasta hacerles el primer recuento.
 */
export function stockLevel(stock: number, minStock: number, tracked: boolean): StockLevel {
  if (!tracked && minStock === 0 && stock === 0) return "sin_contar";
  if (stock <= 0) return "agotado";
  if (stock <= minStock) return "bajo";
  return "ok";
}
