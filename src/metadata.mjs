import modelMetadata from './model-metadata.json' with { type: 'json' };

const metadataById = new Map(Object.entries(modelMetadata.models));

export function metadataFor(id) {
  return metadataById.get(id);
}
