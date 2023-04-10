# Athena Plugin - Clothing

A simple clothing plugin for the Athena Framework compatible with `3.9.0` of the [Athena Framework](https://athenaframework.com/).

Allows players to visit a shop and purchase clothing. That's about it.

## Installation

1. Open a command prompt in your main Athena Directory.
2. Navigate to the plugins folder.

```ts
cd src/core/plugins
```

3. Copy the command below.

**SSH**

```
git clone git@github.com:Stuyk/athena-plugin-clothing.git
```

**HTTPS**
```
git clone https://github.com/Stuyk/athena-plugin-clothing
```

4. Start the Server

5. Core changes will must be made to the following files.
    TODO: Replace Corechanges.

- src/core/shared/interfaces/items.ts

```ts
export interface ClothingComponent {
    ...
   /**
     * Corechange: athena-plugin-clothing
     * 
     * For client-side usage. Do not set manually.
     * Calls the native and gets max drawables for an id.
     * @type {Array<number>}
     * @memberof ClothingComponent
     */
        maxDrawables?: Array<number>;

    /**
     * Corechange: athena-plugin-clothing
     * 
     * For client-side usage. Do not set manually.
     * Calls the native and gets max textures for a drawable id.
     * @type {Array<number>}
     * @memberof ClothingComponent
     */
    maxTextures?: Array<number>;

    /**
     * Corechange: athena-plugin-clothing
     * Current value that player is using.
     *
     * @type {number}
     * @memberof ClothingComponent
     */
    startValue?: number;
    ...
```