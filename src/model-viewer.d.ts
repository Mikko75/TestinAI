import type { DetailedHTMLProps, HTMLAttributes } from 'react'
import type { ModelViewerElement } from '@google/model-viewer'

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
  src?: string
  alt?: string
  ar?: boolean
  'ar-modes'?: string
  'ar-placement'?: 'floor' | 'wall'
  'ar-scale'?: 'auto' | 'fixed'
  'ios-src'?: string
  'camera-controls'?: boolean
  'touch-action'?: 'pan-y' | 'pan-x' | 'none'
  'interaction-prompt'?: 'auto' | 'none'
  'shadow-intensity'?: string
  'environment-image'?: string
  exposure?: string
  loading?: 'auto' | 'lazy' | 'eager'
  reveal?: 'auto' | 'manual'
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes
    }
  }
}
