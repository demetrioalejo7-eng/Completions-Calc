import { el, clear } from './dom.js'

const TONE_LABEL = {
  ok: 'Resultado',
  escalate: 'Atención / escalar',
  info: 'Información',
}

function toneIcon(tone) {
  if (tone === 'escalate') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 1 21h22L12 3Z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="0.6" fill="currentColor" stroke="none"/></svg>`
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/></svg>`
}

function typeBadge(type) {
  const labels = { start: 'Inicio', process: 'Acción', decision: 'Decisión', end: 'Fin' }
  return labels[type] || ''
}

function diagramImageSrc(contingency) {
  // In the single-file Claude Artifact build there is no separate asset host,
  // so the assembly script embeds the images as data URIs on this global map.
  const embedded = typeof window !== 'undefined' && window.__DIAGRAM_IMAGES__
  if (embedded && embedded[contingency.order]) return embedded[contingency.order]
  return `${import.meta.env.BASE_URL}contingencias/diagrama-${contingency.order}.jpg`
}

function openDiagramLightbox(contingency) {
  const overlay = el('div', { class: 'cw-lightbox', role: 'dialog', 'aria-modal': 'true' })
  const close = () => {
    overlay.remove()
    window.removeEventListener('hashchange', close)
  }
  // Navigating away (e.g. browser back) while the overlay is open would
  // otherwise leave it stuck on top of whatever renders next.
  window.addEventListener('hashchange', close)
  const img = el('img', {
    class: 'cw-lightbox-img',
    src: diagramImageSrc(contingency),
    alt: `Diagrama completo: ${contingency.title}`,
  })
  img.addEventListener('error', () => {
    img.replaceWith(el('p', { class: 'cw-lightbox-error' }, 'No se pudo cargar la imagen del diagrama.'))
  })
  overlay.appendChild(
    el('button', { class: 'cw-lightbox-close', type: 'button', 'aria-label': 'Cerrar', onClick: close }, '✕')
  )
  const scroller = el('div', { class: 'cw-lightbox-scroller' }, img)
  scroller.addEventListener('click', (e) => {
    if (e.target === scroller || e.target === overlay) close()
  })
  overlay.appendChild(scroller)
  document.body.appendChild(overlay)
}

export function mountContingencyWizard(container, contingency) {
  clear(container)
  const state = { path: [contingency.start] }

  const wrap = el('div', { class: 'cw' })
  container.appendChild(wrap)

  function currentId() {
    return state.path[state.path.length - 1]
  }

  function goto(nodeId) {
    state.path.push(nodeId)
    render()
  }

  function back() {
    if (state.path.length > 1) state.path.pop()
    render()
  }

  function restart() {
    state.path = [contingency.start]
    render()
  }

  function render() {
    clear(wrap)
    const node = contingency.nodes[currentId()]

    const topBar = el('div', { class: 'cw-topbar' }, [
      el(
        'button',
        { class: 'cw-nav-btn', type: 'button', onClick: back, disabled: state.path.length <= 1 },
        '← Atrás'
      ),
      el('span', { class: 'cw-step' }, `Paso ${state.path.length}`),
      el('button', { class: 'cw-nav-btn', type: 'button', onClick: restart }, 'Reiniciar'),
    ])
    wrap.appendChild(topBar)

    wrap.appendChild(
      el(
        'button',
        { class: 'cw-view-diagram-btn', type: 'button', onClick: () => openDiagramLightbox(contingency) },
        'Ver diagrama completo'
      )
    )

    const toneClass = node.type === 'end' ? ` cw-tone-${node.tone || 'ok'}` : ''
    const card = el('div', { class: `cw-card cw-card--${node.type}${toneClass}` }, [
      el('div', { class: 'cw-card-head' }, [
        node.type === 'end' ? el('span', { class: 'cw-tone-icon', html: toneIcon(node.tone) }) : null,
        el('span', { class: 'cw-badge' }, typeBadge(node.type)),
      ]),
      el('p', { class: 'cw-text' }, node.text),
    ])
    wrap.appendChild(card)

    const actions = el('div', { class: 'cw-actions' })
    if (node.type === 'start') {
      actions.appendChild(el('button', { class: 'btn-secondary', type: 'button', onClick: () => goto(node.next) }, 'Comenzar →'))
    } else if (node.type === 'process') {
      actions.appendChild(el('button', { class: 'btn-secondary', type: 'button', onClick: () => goto(node.next) }, 'Continuar →'))
    } else if (node.type === 'decision') {
      for (const branch of node.branches) {
        actions.appendChild(
          el('button', { class: 'cw-branch-btn', type: 'button', onClick: () => goto(branch.to) }, branch.label)
        )
      }
    } else if (node.type === 'end') {
      if (node.link) {
        actions.appendChild(el('a', { class: 'btn-secondary', href: `#/s/contingencias/${node.link.to}` }, node.link.label))
      }
      actions.appendChild(el('button', { class: 'btn-secondary', type: 'button', onClick: restart }, 'Reiniciar diagrama'))
    }
    wrap.appendChild(actions)

    // Trail of steps taken (only shown once there is history worth reviewing)
    if (state.path.length > 1) {
      const trail = el('details', { class: 'cw-trail' })
      trail.appendChild(el('summary', {}, 'Ver camino recorrido'))
      const list = el('ol', { class: 'cw-trail-list' })
      state.path.forEach((id, idx) => {
        const n = contingency.nodes[id]
        list.appendChild(
          el(
            'li',
            {},
            el(
              'button',
              {
                type: 'button',
                class: 'cw-trail-item',
                onClick: () => {
                  state.path = state.path.slice(0, idx + 1)
                  render()
                },
              },
              n.text
            )
          )
        )
      })
      trail.appendChild(list)
      wrap.appendChild(trail)
    }

    // Reference panel: legend + notes + original diagram image (always available)
    const ref = el('details', { class: 'cw-ref' })
    ref.appendChild(el('summary', {}, 'Notas, referencias y diagrama original'))
    const refBody = el('div', { class: 'cw-ref-body' })
    if (contingency.legend.length) {
      refBody.appendChild(el('p', { class: 'cw-ref-title' }, 'Referencias'))
      refBody.appendChild(el('ul', { class: 'cw-ref-list' }, contingency.legend.map((t) => el('li', {}, t))))
    }
    if (contingency.notes.length) {
      refBody.appendChild(el('p', { class: 'cw-ref-title' }, 'Notas'))
      refBody.appendChild(el('ul', { class: 'cw-ref-list' }, contingency.notes.map((t) => el('li', {}, t))))
    }
    refBody.appendChild(el('p', { class: 'cw-ref-title' }, 'Diagrama original (tocá para ampliar)'))
    const img = el('img', {
      class: 'cw-ref-img',
      loading: 'lazy',
      src: diagramImageSrc(contingency),
      alt: `Diagrama original: ${contingency.title}`,
    })
    img.addEventListener('click', () => openDiagramLightbox(contingency))
    img.addEventListener('error', () => {
      img.replaceWith(el('p', { class: 'note' }, 'No se pudo cargar la imagen del diagrama original.'))
    })
    refBody.appendChild(img)
    ref.appendChild(refBody)
    wrap.appendChild(ref)
  }

  render()
}
