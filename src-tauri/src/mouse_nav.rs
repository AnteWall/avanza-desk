//! The mouse's back/forward buttons on macOS. Plain button 3/4 clicks reach the page as DOM
//! events through wry, but some mice and drivers send swipe gestures (Logitech MX and similar)
//! or system-defined aux-button events instead, which the page never sees. Catch those
//! natively, swallow them, and tell the frontend, which moves through its router history.

use std::cell::Cell;
use std::ptr::{self, NonNull};
use std::time::{Duration, Instant};

use block2::RcBlock;
use objc2_app_kit::{NSEvent, NSEventMask, NSEventType};
use tauri::{AppHandle, Emitter};

pub fn init(app: &AppHandle) {
    let app = app.clone();
    // One swipe press fires several events; emit once per press.
    let last_swipe = Cell::new(Instant::now() - Duration::from_secs(1));
    let handler = RcBlock::new(move |event: NonNull<NSEvent>| -> *mut NSEvent {
        let e = unsafe { event.as_ref() };
        let ty = e.r#type();
        let dir = if ty == NSEventType::Swipe {
            let dx = e.deltaX();
            if dx.abs() < 0.5 {
                return event.as_ptr();
            }
            if last_swipe.get().elapsed() < Duration::from_millis(200) {
                return ptr::null_mut();
            }
            last_swipe.set(Instant::now());
            if dx > 0.0 { "back" } else { "forward" }
        } else {
            // System-defined, subtype 7: aux mouse buttons; data1 is the button mask,
            // data2 non-zero on press.
            if e.subtype().0 != 7 {
                return event.as_ptr();
            }
            let dir = match e.data1() {
                8 => "back",     // 1 << 3
                16 => "forward", // 1 << 4
                _ => return event.as_ptr(),
            };
            if e.data2() == 0 {
                return ptr::null_mut(); // release
            }
            dir
        };
        let _ = app.emit("history-nav", dir);
        ptr::null_mut()
    });
    let mask = NSEventMask::Swipe | NSEventMask::SystemDefined;
    // Lives as long as the app, so the monitor is never removed.
    std::mem::forget(unsafe {
        NSEvent::addLocalMonitorForEventsMatchingMask_handler(mask, &handler)
    });
}
