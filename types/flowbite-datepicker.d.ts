declare module 'flowbite-datepicker/Datepicker' {
  interface DatepickerOptions {
    autohide?: boolean;
    format?: string;
    minDate?: Date;
    maxDate?: Date;
    todayBtn?: boolean;
    clearBtn?: boolean;
    todayBtnMode?: number;
    orientation?: string;
  }

  class Datepicker {
    constructor(element: HTMLElement, options?: DatepickerOptions);
    destroy(): void;
    show(): void;
    hide(): void;
    getDate(): Date | null;
    setDate(date: Date | string): void;
  }

  export default Datepicker;
}
