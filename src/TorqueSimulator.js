import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Github } from 'lucide-react';

const TorqueSimulator = () => {
  const [diskMass, setDiskMass] = useState(1);
  const [cursorMass, setCursorMass] = useState(1);
  const [diskState, setDiskState] = useState({
    angularVelocity: 0,
    angularAcceleration: 0,
    rotation: 0,
  });
  const [accelerationData, setAccelerationData] = useState([]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [contactRadius, setContactRadius] = useState(null);
  const [lastAngle, setLastAngle] = useState(null);
  const [enableFriction, setEnableFriction] = useState(false);
  const diskRef = useRef(null);
  const startTime = useRef(Date.now());
  const lastUpdateTime = useRef(Date.now());

  const frictionCoefficient = 0.1; // Adjust this value to change friction strength
  const defaultMass = 1; // Default mass to use when invalid mass is entered

  const calculateTorque = (currentAngle, lastAngle, radius) => {
    if (lastAngle === null) return 0;
    const angleDiff = (currentAngle - lastAngle + 360) % 360;
    const direction = angleDiff > 180 ? -1 : 1;
    const force = cursorMass * 9.8; // Simplified force calculation
    return direction * force * radius / 100; // Scaling factor
  };

  const calculateAngularAcceleration = (torque, angularVelocity) => {
    const diskRadius = diskRef.current.offsetWidth / 2;
    const effectiveMass = diskMass > 0 ? diskMass : defaultMass;
    const moment = (effectiveMass * Math.pow(diskRadius, 2)) / 2; // I = mr^2 / 2 for a disk
    let angularAcceleration = torque / moment;
    
    if (enableFriction) {
      const frictionTorque = -frictionCoefficient * angularVelocity * moment;
      angularAcceleration += frictionTorque / moment;
    }
    
    return angularAcceleration;
  };

  useEffect(() => {
    const updateSimulation = () => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastUpdateTime.current) / 1000; // Convert to seconds
      lastUpdateTime.current = currentTime;

      let torque = 0;
      if (isDragging && contactRadius !== null && lastAngle !== null) {
        const currentAngle = Math.atan2(cursorPosition.y - 32, cursorPosition.x - 32) * 180 / Math.PI;
        torque = calculateTorque(currentAngle, lastAngle, contactRadius);
        setLastAngle(currentAngle);
      }

      setDiskState(prevState => {
        const angularAcceleration = calculateAngularAcceleration(torque, prevState.angularVelocity);
        const newAngularVelocity = prevState.angularVelocity + angularAcceleration * deltaTime;
        const newRotation = (prevState.rotation + newAngularVelocity * deltaTime * 180 / Math.PI) % 360;
        
        return {
          angularVelocity: newAngularVelocity,
          angularAcceleration: angularAcceleration,
          rotation: newRotation,
        };
      });

      const elapsedTime = (currentTime - startTime.current) / 1000;
      setAccelerationData(prevData => [
        ...prevData,
        { time: elapsedTime, acceleration: diskState.angularAcceleration }
      ]);
    };

    const animationFrame = requestAnimationFrame(updateSimulation);
    return () => cancelAnimationFrame(animationFrame);
  }, [isDragging, cursorMass, diskMass, contactRadius, diskState.angularVelocity, cursorPosition, lastAngle, enableFriction]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleMouseMove(e);
    setLastAngle(null); // Reset last angle on new drag
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setContactRadius(null);
    setLastAngle(null);
  };

  const handleMouseMove = (e) => {
    if (!diskRef.current) return;
    const disk = diskRef.current;
    const rect = disk.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newX = e.clientX - rect.left;
    const newY = e.clientY - rect.top;
    setCursorPosition({ x: newX, y: newY });

    if (isDragging) {
      const radius = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2));
      setContactRadius(radius);
      const currentAngle = Math.atan2(newY - centerY, newX - centerX) * 180 / Math.PI;
      if (lastAngle === null) {
        setLastAngle(currentAngle);
      }
    }
  };

  const handleDiskMassChange = (e) => {
    const value = Number(e.target.value);
    setDiskMass(value);
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen relative">
      <a href="https://github.com/cxnmai" target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4">
        <Github size={24} />
      </a>
      <div className="mb-4">
        <label className="mr-2">Disk Mass (kg):</label>
        <input
          type="number"
          value={diskMass}
          onChange={handleDiskMassChange}
          className="border p-1"
        />
        {diskMass <= 0 && (
          <span className="text-red-500 ml-2">
            Invalid mass. Using default mass of {defaultMass} kg.
          </span>
        )}
      </div>
      <div className="mb-4">
        <label className="mr-2">Cursor Mass (kg):</label>
        <input
          type="number"
          value={cursorMass}
          onChange={(e) => setCursorMass(Number(e.target.value))}
          className="border p-1"
        />
      </div>
      <div className="mb-4">
        <label className="mr-2">Enable Friction:</label>
        <input
          type="checkbox"
          checked={enableFriction}
          onChange={(e) => setEnableFriction(e.target.checked)}
          className="border p-1"
        />
      </div>
      <div className="relative w-64 h-64 bg-gray-300 rounded-full mx-auto mb-4" 
           ref={diskRef} 
           onMouseDown={handleMouseDown}
           onMouseMove={handleMouseMove}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}>
        <div className="absolute top-0 left-0 w-full h-full"
             style={{transform: `rotate(${diskState.rotation}deg)`}}>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-1 h-32 bg-black transform -translate-x-1/2 -translate-y-1/2 origin-bottom"></div>
        </div>
        {contactRadius && (
          <div className="absolute top-1/2 left-1/2 w-1 bg-red-500 transform -translate-x-1/2 -translate-y-1/2 origin-bottom"
               style={{
                 height: `${contactRadius}px`, 
                 transform: `rotate(${Math.atan2(cursorPosition.y - 32, cursorPosition.x - 32) * 180 / Math.PI}deg)`
               }}>
          </div>
        )}
        <div className="absolute w-4 h-4 bg-red-500 rounded-full pointer-events-none"
             style={{left: `${cursorPosition.x - 8}px`, top: `${cursorPosition.y - 8}px`}}></div>
      </div>
      <div className="mb-4">Angular Velocity: {diskState.angularVelocity.toFixed(2)} rad/s</div>
      <div className="mb-4">Angular Acceleration: {diskState.angularAcceleration.toFixed(2)} rad/s²</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={accelerationData}>
            <XAxis 
              dataKey="time" 
              type="number" 
              domain={['dataMin', 'dataMax']} 
              label={{ value: 'Time (s)', position: 'bottom' }}
            />
            <YAxis label={{ value: 'Angular Acceleration (rad/s²)', angle: -90, position: 'insideLeft' }} />
            <Line type="monotone" dataKey="acceleration" stroke="#8884d8" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TorqueSimulator;