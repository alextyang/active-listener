
export function Body({ children }: Readonly<{ children: React.ReactNode; }>) {

    return (
        <div className='body'>
            {children}
        </div>
    );
}