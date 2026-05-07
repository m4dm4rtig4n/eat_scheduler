"use client";

import { useRef, useCallback } from "react";

// Hook qui détecte un appui long (souris ou tactile) sans interférer avec
// le drag-and-drop @dnd-kit du composant parent.
//
// Stratégie anti-conflit :
// - On démarre un timer au pointerdown.
// - Si le pointeur bouge (>tolerance px), on annule le timer : c'est un drag,
//   pas un appui long. Cela laisse @dnd-kit prendre la main.
// - Si le pointeur se relâche avant la fin du timer, on annule : c'est un tap.
// - Si le timer expire (le doigt est resté immobile pendant `delay` ms),
//   on déclenche `onLongPress` et on neutralise le prochain click pour éviter
//   qu'il ne se propage à un onClick parent.

export type LongPressHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onClickCapture: (e: React.MouseEvent) => void;
};

export type UseLongPressOptions = {
  /** Durée d'appui (ms) avant déclenchement. Défaut : 500. */
  delay?: number;
  /** Tolérance de mouvement (px) avant annulation. Défaut : 10. */
  tolerance?: number;
  /** Vibration au déclenchement (ms). 0 ou undefined = pas de vibration. */
  vibrateMs?: number;
};

export function useLongPress(
  onLongPress: () => void,
  options: UseLongPressOptions = {}
): LongPressHandlers {
  const { delay = 500, tolerance = 10, vibrateMs = 50 } = options;

  // État interne du geste, gardé en ref pour ne pas re-render inutilement.
  const timerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  // Marqueur : le long-press a-t-il été déclenché lors de ce cycle ?
  // Sert à neutraliser le click qui suit (sinon onClick parent se déclenche).
  const triggeredRef = useRef(false);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // TODO(toi) : Implémente la détection du long-press ici.
  //
  // Cette fonction est appelée à chaque pointerdown. Elle doit :
  //   1. Mémoriser la position de départ (startPosRef.current = { x, y }).
  //   2. Réinitialiser triggeredRef.current à false.
  //   3. Démarrer un timer (window.setTimeout) qui, à expiration :
  //      - met triggeredRef.current = true
  //      - déclenche la vibration si vibrateMs > 0 et navigator.vibrate existe
  //      - appelle onLongPress()
  //   4. Stocker l'id du timer dans timerRef.current pour pouvoir l'annuler.
  //
  // Pourquoi cette logique compte :
  // - Si tu oublies de stocker la position de départ, onPointerMove ne pourra
  //   pas mesurer la distance parcourue → le drag annulera mal le timer.
  // - Si tu oublies de reset triggeredRef, un long-press précédent pourrait
  //   bloquer un click légitime suivant.
  // - navigator.vibrate n'existe pas sur desktop : check `'vibrate' in navigator`
  //   ou `typeof navigator.vibrate === 'function'` avant d'appeler.
  //
  // Les paramètres `delay`, `tolerance`, `vibrateMs`, `onLongPress` sont
  // dispo dans la closure (déstructurés au-dessus).
  // ─────────────────────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // TODO : implémente moi
    },
    [delay, vibrateMs, onLongPress]
  );

  // Annule le timer si le pointeur bouge au-delà de la tolérance.
  // C'est ce qui évite le conflit avec le drag : dès que @dnd-kit déplace
  // la carte, on abandonne le long-press.
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = startPosRef.current;
      if (!start || timerRef.current === null) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx * dx + dy * dy > tolerance * tolerance) {
        cancelTimer();
      }
    },
    [tolerance, cancelTimer]
  );

  const handlePointerEnd = useCallback(() => {
    cancelTimer();
    startPosRef.current = null;
  }, [cancelTimer]);

  // Si le long-press a déclenché, on absorbe le click qui suit naturellement
  // pour qu'il ne propage pas à un onClick parent (ex. ouverture de modale).
  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (triggeredRef.current) {
      e.stopPropagation();
      e.preventDefault();
      triggeredRef.current = false;
    }
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    onPointerLeave: handlePointerEnd,
    onClickCapture: handleClickCapture,
  };
}
