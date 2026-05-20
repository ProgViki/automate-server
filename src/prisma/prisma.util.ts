type Id = string;
type HasId = Id | { id: Id };

export function toId(id: HasId) {
  return { id: typeof id === 'object' ? id.id : id };
}

export function connectId(id: string) {
  return { connect: { id } };
}

export function connectIds(items: HasId[] | undefined) {
  return items ? { connect: items.map(toId) } : undefined;
}

export function createAttachments(uploadIds?: string[]) {
  if (!uploadIds?.length) return undefined;
  return { create: { uploads: connectIds(uploadIds) } };
}
