# mutevents

![events graph](https://i.imgur.com/Se9fNFI.png?1)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fhazae41%2Fdeno-events.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fhazae41%2Fdeno-events?ref=badge_shield)

Events allows multiple listeners (A, B, C) to be executed when objects (O, S) trigger them; without ever knowing their existence at compile time.

## Syntax

The syntax is (almost) the same as nodejs EventEmitter.

	emitter.emit(event: string, ...args: any[]): EventResult
	emitter.on([event: string, priority: string], listener: (...args: any[]) => ListenerResult): void
	emitter.off(...) same as on()

There is no once() function since events can be cancelled. You have to stick with on() and off() when you want to remove the listener.

## Types

Types are useful with TypeScript autocompletion and compiler warnings. Plus, they allow you to inherit events from a superclass.

### Class way

We define a generic type Animal with a "death" event type

	class Animal<T> extends EventEmitter<T | "death"> {
		// ...	
	}

Then we define a type Dog that extends Animal with a "woof" event type.

	class Dog extends Animal<"woof"> {
		// ...
	}

Dog can now emit two event types: "woof" and "death"

### Attribute way

We define an interface Animal with an events attribute.
OpenEventEmitter is like a regular emitter but we can override its event types.
Animal can emit "death" event type.
	
	interface Animal {
		events: OpenEventEmitter<"death">
	}

Then we define a type Duck that overrides Animal's events attribute type to inject a new "quack" event type.

	interface Duck extends Animal {
		events: OpenEventEmitter<"quack" | "death">
	}

Duck can now emit both "quack" and "death".

Note we could completely remove the "death" event from Duck

	interface GodDuck extends Animal {
		events: OpenEventEmitter<"quack">
	}

Implementation

    class Quacky implements Duck {
        events = emitter<"quack" | "death">() // OpenEventEmitter<"quack" | "death">
    }

## Priorities

An event listener can have a priority:
- "high" means it will be handled first
- "normal" means normal
- "low" means it will be handled last

The priority must be defined in the array after the event name. If no priority is defined, "normal" will be used.

Example

		dog.on(["woof"], () => console.log("Normal"));
		dog.on(["woof", "low"], () => console.log("Last"));
		dog.on(["woof", "high"], () => console.log("First"));

The "low" listener will be executed after the "normal" one, which will be executed after the "high" one.

When multiple listeners are on the same priority, the first defined will be the first executed.

		dog.on(["woof", "high"], () => console.log("First"));
		dog.on(["woof", "high"], () => console.log("Last"));

## Cancellation

Any event can be cancelled by any listener. The listener needs to explicitly return a "cancelled" string.
The next listener will not be executed, and the emit() result will be "cancelled".

	dog.on(["woof", "high"], () => "cancelled");
	dog.on(["woof"], () => console.log("This won't be displayed"));

Block form

	dog.on(["woof"], () => {
		if(dog.name !== "Rex") return "cancelled";
		console.log("Rex: woof");
	});

You can check for cancellation on the emitter side

	const result = dog.emit("woof");
	if(result === "cancelled") return;

## Mutability

Any event is mutable by any listener. If a listener returns an array, the next listener will be passed this array.

	player.on(["command"], (cmd: string) => {
		if(cmd === "man") return ["tldr"];
	})

	player.on(["command"], (cmd: string) => {
		// cmd is now "tldr"
	})

With multiple arguments

	player.on(["move"], (x, y, z) => {
		return [x, 0, z];
	})

	player.on(["move"], (x, y, z) => {
		// y is now 0
	})

You can retrieve modification on the emitter side

	let x = 1;
	let y = 2;
	let z = 3;
	
	const result = player.emit("move", x, y, z);
	if(result === "cancelled") return; // optional
	[x, y, z] = result;

## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fhazae41%2Fdeno-events.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fhazae41%2Fdeno-events?ref=badge_large)
=======
